import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "./useAuth";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  data?: Record<string, any>;
}

export function useNotifications() {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async (): Promise<Notification[]> => {
      try {
        // Implement a notifications endpoint in the backend
        // For now, this is a placeholder
        return [];
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
