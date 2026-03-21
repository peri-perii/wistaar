import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "./useAuth";

export interface CartItem {
  id: string;
  bookId: string;
  bookTitle?: string;
  addedAt: string;
}

export function useCart() {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["cart", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async (): Promise<CartItem[]> => {
      try {
        const response = await apiClient.getCart();
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch cart:', error);
        throw error;
      }
    },
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (bookId: string) => apiClient.addToCart(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (bookId: string) => apiClient.removeFromCart(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
    },
  });
}
