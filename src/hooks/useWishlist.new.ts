import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "./useAuth";

export interface WishlistItem {
  id: string;
  bookId: string;
  bookTitle?: string;
  addedAt: string;
}

export function useWishlist() {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async (): Promise<WishlistItem[]> => {
      try {
        const response = await apiClient.getWishlist();
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch wishlist:', error);
        throw error;
      }
    },
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (bookId: string) => apiClient.addToWishlist(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", user?.id] });
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (bookId: string) => apiClient.removeFromWishlist(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", user?.id] });
    },
  });
}
