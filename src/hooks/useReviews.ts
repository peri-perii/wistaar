import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Review {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  display_name?: string;
  avatar_url?: string;
}

export function useBookReviews(bookId: string | undefined) {
  return useQuery({
    queryKey: ["book-reviews", bookId],
    enabled: !!bookId,
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from("book_reviews")
        .select("*")
        .eq("book_id", bookId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return data.map((r) => {
        const profile = profileMap.get(r.user_id);
        return {
          ...r,
          display_name: profile?.display_name || "Anonymous",
          avatar_url: profile?.avatar_url || null,
        };
      });
    },
  });
}

export function useBookAverageRating(bookId: string | undefined) {
  const { data: reviews } = useBookReviews(bookId);
  if (!reviews || reviews.length === 0) return { average: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { average: sum / reviews.length, count: reviews.length };
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      bookId,
      rating,
      reviewText,
    }: {
      bookId: string;
      rating: number;
      reviewText?: string;
    }) => {
      if (!user) throw new Error("Must be logged in");

      const { error } = await supabase.from("book_reviews").upsert(
        {
          book_id: bookId,
          user_id: user.id,
          rating,
          review_text: reviewText || null,
        },
        { onConflict: "book_id,user_id" }
      );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["book-reviews", variables.bookId] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, bookId }: { reviewId: string; bookId: string }) => {
      const { error } = await supabase.from("book_reviews").delete().eq("id", reviewId);
      if (error) throw error;
      return bookId;
    },
    onSuccess: (bookId) => {
      queryClient.invalidateQueries({ queryKey: ["book-reviews", bookId] });
    },
  });
}
