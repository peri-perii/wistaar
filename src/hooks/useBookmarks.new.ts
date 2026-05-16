import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "./useAuth";

export interface Bookmark {
  id: string;
  bookId: string;
  chapterNumber: number;
  pageNumber?: number;
  markedAt: string;
}

export function useBookmarks(bookId?: string) {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["bookmarks", user?.id, bookId],
    enabled: !!user && !authLoading,
    queryFn: async (): Promise<Bookmark[]> => {
      try {
        // Would need a dedicated endpoint to fetch bookmarks
        // Placeholder implementation
        return [];
      } catch (error) {
        console.error('Failed to fetch bookmarks:', error);
        throw error;
      }
    },
  });
}

export function useAddBookmark() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      bookId,
      chapterNumber,
      pageNumber,
    }: {
      bookId: string;
      chapterNumber: number;
      pageNumber?: number;
    }) => apiClient.addBookmark(bookId, chapterNumber, pageNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

export function useRemoveBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookmarkId: string) => apiClient.removeBookmark(bookmarkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}
