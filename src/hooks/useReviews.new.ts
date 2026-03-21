import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "./useAuth";

export interface BookReview {
  id: string;
  userId: string;
  bookId: string;
  rating: number;
  reviewText?: string;
  isApproved: boolean;
  createdAt: string;
}

export function useBookReviews(bookId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", bookId],
    enabled: !!bookId,
    queryFn: async (): Promise<BookReview[]> => {
      try {
        const response = await apiClient.getBookReviews(bookId!);
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
        throw error;
      }
    },
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookId,
      rating,
      reviewText,
    }: {
      bookId: string;
      rating: number;
      reviewText?: string;
    }) => apiClient.submitReview(bookId, rating, reviewText),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", variables.bookId] });
    },
  });
}
