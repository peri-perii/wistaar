import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

// ─── Core fetch function ──────────────────────────────────────────────────────

async function fetchDashboardData(userId: string) {
  // 1. Profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, username, bio, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  const profileData: AuthorProfileData = {
    displayName: profile?.display_name || "Unknown Author",
    username:    profile?.username    || "",
    bio:         profile?.bio         || "",
    avatarUrl:   profile?.avatar_url  || "",
  };

  // 2. Approved books
  const { data: books, error: booksError } = await supabase
    .from("book_submissions")
    .select("id, title, price, genre, status, rating, cover_image_url")
    .eq("author_id", userId)
    .eq("status", "approved");

  if (booksError) throw booksError;

  // 3. Followers
  const { count: followersCount, error: followersError } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);

  if (followersError) throw followersError;

  if (!books || books.length === 0) {
    return {
      profile: profileData,
      stats: {
        totalBooks:    0,
        totalSales:    0,
        totalEarnings: 0,
        followers:     followersCount || 0,
      } as DashboardStats,
      books: [] as DashboardBook[],
    };
  }

  // 4. Purchases → calculate sales + earnings
  const bookIds = books.map((b) => b.id);
  const { data: purchases, error: purchasesError } = await supabase
    .from("book_purchases")
    .select("book_id, amount")
    .in("book_id", bookIds)
    .eq("payment_status", "completed");

  if (purchasesError) throw purchasesError;

  const salesMap = new Map<string, { count: number; gross: number }>();
  bookIds.forEach((id) => salesMap.set(id, { count: 0, gross: 0 }));

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
      id:         book.id,
      title:      book.title,
      coverUrl:   book.cover_image_url,
      genre:      book.genre,
      status:     book.status,
      price:      book.price,
      copiesSold: stats.count,
      rating:     Number(book.rating || 0),
      earnings:   Number((stats.gross * 0.65).toFixed(2)),
    };
  });

  const totalSales    = dashboardBooks.reduce((s, b) => s + b.copiesSold, 0);
  const totalEarnings = dashboardBooks.reduce((s, b) => s + b.earnings,   0);

  return {
    profile: profileData,
    stats: {
      totalBooks:    books.length,
      totalSales,
      totalEarnings: Number(totalEarnings.toFixed(2)),
      followers:     followersCount || 0,
    } as DashboardStats,
    books: dashboardBooks,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthorDashboardData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["author-dashboard-data", user?.id];

  // ── React Query for initial load + cache management ──────────────────────
  const query = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: () => fetchDashboardData(user!.id),
    staleTime: 0, // always re-fetch fresh on focus
  });

  // ── Supabase Realtime — invalidate cache when any relevant table changes ──
  useEffect(() => {
    if (!user) return;

    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey });

    const channel = supabase
      .channel(`author-dashboard-realtime-${user.id}`)
      // Book approved / new submission status change
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "book_submissions", filter: `author_id=eq.${user.id}` },
        invalidate
      )
      // New purchase on any of this author's books
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "book_purchases" },
        invalidate
      )
      // Follower gained / lost
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows", filter: `following_id=eq.${user.id}` },
        invalidate
      )
      // Profile updated (display name, bio, avatar)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return query;
}
