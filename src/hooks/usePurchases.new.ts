import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "./useAuth";

export interface Purchase {
  id: string;
  bookId: string;
  amount: number;
  paymentStatus: string;
  purchasedAt: string;
  bookTitle?: string;  // Will be fetched separately
}

export function usePurchases() {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["purchases", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async (): Promise<Purchase[]> => {
      try {
        const response = await apiClient.getPurchases();
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch purchases:', error);
        throw error;
      }
    },
  });
}

export function useHasPurchased(bookId: string | undefined) {
  const { user, loading: authLoading } = useAuth();
  const { data: purchases } = usePurchases();

  return useQuery({
    queryKey: ["has-purchased", user?.id, bookId],
    enabled: !!user && !!bookId && !authLoading && !!purchases,
    queryFn: async () => {
      try {
        return purchases?.some(p => p.bookId === bookId) ?? false;
      } catch (error) {
        console.error('Failed to check purchase:', error);
        throw error;
      }
    },
  });
}
