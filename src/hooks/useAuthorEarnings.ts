import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface BookEarnings {
  id: string;
  title: string;
  price: number;
  salesCount: number;
  totalRevenue: number;
  genre: string;
  status: string;
}

export interface EarningsStats {
  totalEarnings: number;
  totalSales: number;
  topBook: BookEarnings | null;
  percentageChange?: number;
}

export function useAuthorEarnings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["author-earnings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get all books by this author
      const { data: books, error: booksError } = await supabase
        .from("book_submissions")
        .select("id, title, price, genre, status, total_chapters")
        .eq("author_id", user!.id)
        .eq("status", "approved");

      if (booksError) throw booksError;

      if (!books || books.length === 0) {
        return {
          totalEarnings: 0,
          totalSales: 0,
          topBook: null,
          bookEarnings: [] as BookEarnings[],
        };
      }

      // Get purchase data for each book
      const bookIds = books.map((b) => b.id);
      const { data: purchases, error: purchasesError } = await supabase
        .from("book_purchases")
        .select("book_id, amount, payment_status")
        .in("book_id", bookIds)
        .eq("payment_status", "completed");

      if (purchasesError) throw purchasesError;

      // Calculate earnings per book
      const bookEarningsMap = new Map<string, BookEarnings>();
      books.forEach((book) => {
        bookEarningsMap.set(book.id, {
          id: book.id,
          title: book.title,
          price: book.price,
          salesCount: 0,
          totalRevenue: 0,
          genre: book.genre,
          status: book.status,
        });
      });

      // Aggregate purchase data
      purchases?.forEach((purchase) => {
        const earnings = bookEarningsMap.get(purchase.book_id);
        if (earnings) {
          earnings.salesCount += 1;
          earnings.totalRevenue += purchase.amount;
        }
      });

      const bookEarnings = Array.from(bookEarningsMap.values());
      const totalEarnings = bookEarnings.reduce((sum, b) => sum + b.totalRevenue, 0);
      const totalSales = bookEarnings.reduce((sum, b) => sum + b.salesCount, 0);
      const topBook = bookEarnings.length > 0
        ? bookEarnings.reduce((top, b) => (b.totalRevenue > top.totalRevenue ? b : top))
        : null;

      return {
        totalEarnings,
        totalSales,
        topBook,
        bookEarnings: bookEarnings.sort((a, b) => b.totalRevenue - a.totalRevenue),
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useBookSalesHistory(bookId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["book-sales-history", bookId],
    enabled: !!user && !!bookId,
    queryFn: async () => {
      const { data: purchases, error } = await supabase
        .from("book_purchases")
        .select("id, amount, payment_status, purchased_at")
        .eq("book_id", bookId)
        .eq("payment_status", "completed")
        .order("purchased_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return purchases || [];
    },
    refetchInterval: 30000,
  });
}
