import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DashboardBook {
  id: string;
  title: string;
  coverUrl: string | null;
  genre: string;
  status: string;
  price: number;
  copiesSold: number;
  rating: number;
  earnings: number; // 65% of total revenue
}

export interface DashboardStats {
  totalBooks: number;
  totalSales: number;
  totalEarnings: number; // 65% of total gross sales
  followers: number;
}

export interface AuthorProfileData {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
}

export function useAuthorDashboardData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["author-dashboard-data", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      // 1. Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, username, bio, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const profileData: AuthorProfileData = {
        displayName: profile?.display_name || "Unknown Author",
        username: profile?.username || "",
        bio: profile?.bio || "",
        avatarUrl: profile?.avatar_url || "",
      };

      // 2. Fetch published/approved books by this author
      const { data: books, error: booksError } = await supabase
        .from("book_submissions")
        .select("id, title, price, genre, status, rating, cover_image_url")
        .eq("author_id", user.id)
        .eq("status", "approved");

      if (booksError) throw booksError;

      // 3. Fetch followers count
      const { count: followersCount, error: followersError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);

      if (followersError) throw followersError;

      if (!books || books.length === 0) {
        return {
          profile: profileData,
          stats: {
            totalBooks: 0,
            totalSales: 0,
            totalEarnings: 0,
            followers: followersCount || 0,
          } as DashboardStats,
          books: [] as DashboardBook[],
        };
      }

      // 4. Fetch completed purchases for these books to calculate copies sold and earnings
      const bookIds = books.map((b) => b.id);
      const { data: purchases, error: purchasesError } = await supabase
        .from("book_purchases")
        .select("book_id, amount")
        .in("book_id", bookIds)
        .eq("payment_status", "completed");

      if (purchasesError) throw purchasesError;

      // Aggregate sales and calculate earnings per book
      const salesMap = new Map<string, { count: number; gross: number }>();
      bookIds.forEach((id) => {
        salesMap.set(id, { count: 0, gross: 0 });
      });

      purchases?.forEach((purchase) => {
        const stats = salesMap.get(purchase.book_id);
        if (stats) {
          stats.count += 1;
          stats.gross += purchase.amount;
        }
      });

      const dashboardBooks: DashboardBook[] = books.map((book) => {
        const stats = salesMap.get(book.id) || { count: 0, gross: 0 };
        return {
          id: book.id,
          title: book.title,
          coverUrl: book.cover_image_url,
          genre: book.genre,
          status: book.status,
          price: book.price,
          copiesSold: stats.count,
          rating: Number(book.rating || 0),
          earnings: Number((stats.gross * 0.65).toFixed(2)),
        };
      });

      const totalSales = dashboardBooks.reduce((sum, b) => sum + b.copiesSold, 0);
      const totalEarnings = dashboardBooks.reduce((sum, b) => sum + b.earnings, 0);

      return {
        profile: profileData,
        stats: {
          totalBooks: books.length,
          totalSales,
          totalEarnings: Number(totalEarnings.toFixed(2)),
          followers: followersCount || 0,
        } as DashboardStats,
        books: dashboardBooks,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
