import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";

export interface BookChapter {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  content: string;
  wordCount?: number;
}

export function useBookChapters(bookId: string | undefined) {
  return useQuery({
    queryKey: ["chapters", bookId],
    enabled: !!bookId,
    queryFn: async (): Promise<BookChapter[]> => {
      try {
        const response = await apiClient.getBookChapters(bookId!);
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch chapters:', error);
        throw error;
      }
    },
  });
}
