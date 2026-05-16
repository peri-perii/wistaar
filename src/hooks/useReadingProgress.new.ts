import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "./useAuth";

export interface ReadingProgress {
  id: string;
  bookId: string;
  currentChapter: number;
  currentPage: number;
  percentageRead: number;
  lastReadAt?: string;
}

export function useReadingProgress(bookId: string | undefined) {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["reading-progress", user?.id, bookId],
    enabled: !!user && !!bookId && !authLoading,
    queryFn: async (): Promise<ReadingProgress> => {
      try {
        const response = await apiClient.getReadingProgress(bookId!);
        return response.data;
      } catch (error) {
        console.error('Failed to fetch reading progress:', error);
        throw error;
      }
    },
  });
}

export function useUpdateReadingProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      bookId,
      data,
    }: {
      bookId: string;
      data: {
        currentChapter?: number;
        currentPage?: number;
        percentageRead?: number;
      };
    }) => apiClient.updateReadingProgress(bookId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["reading-progress", user?.id, variables.bookId],
      });
    },
  });
}

// ============================================================================
// BOOKMARKS
// ============================================================================

export interface Bookmark {
  id: string;
  bookId: string;
  chapterNumber: number;
  pageNumber?: number;
  markedAt: string;
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
      queryClient.invalidateQueries({ queryKey: ["bookmarks", user?.id] });
    },
  });
}

export function useRemoveBookmark() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (bookmarkId: string) => apiClient.removeBookmark(bookmarkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks", user?.id] });
    },
  });
}
