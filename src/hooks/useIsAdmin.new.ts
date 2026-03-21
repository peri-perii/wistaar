import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "./useAuth";

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async (): Promise<boolean> => {
      try {
        // This would need to be implemented as part of the getCurrentUser response
        // or a separate endpoint. For now, check if user has admin role
        const dashboard = await apiClient.getAdminDashboard();
        return !!dashboard.data;
      } catch (error) {
        return false;
      }
    },
  });
}
