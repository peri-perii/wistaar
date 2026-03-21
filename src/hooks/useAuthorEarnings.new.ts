import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "./useAuth";

export interface AuthorEarning {
  bookId: string;
  bookTitle: string;
  totalEarnings: number;
  totalSales: number;
  averageRating: number;
}

export interface AuthorStats {
  totalEarnings: number;
  totalBooks: number;
  totalSales: number;
  earnings: AuthorEarning[];
}

export function useAuthorEarnings() {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["author-earnings", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async (): Promise<AuthorStats> => {
      try {
        // This would need a dedicated endpoint in the backend
        // For now, fetch from admin dashboard
        const response = await apiClient.getAdminDashboard();
        return response.data || { totalEarnings: 0, totalBooks: 0, totalSales: 0, earnings: [] };
      } catch (error) {
        console.error('Failed to fetch earnings:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
