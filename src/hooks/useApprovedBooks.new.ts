import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";

export interface Book {
  id: string;
  title: string;
  description: string;
  genre: string;
  price?: number;
  coverImageUrl?: string;
  authorId: string;
  authorName?: string;
  status: string;
  totalChapters?: number;
}

export function useApprovedBooks(genre?: string) {
  return useQuery({
    queryKey: ["approved-books", genre],
    queryFn: async (): Promise<Book[]> => {
      try {
        const response = await apiClient.getApprovedBooks({
          genre,
          limit: 100,
        });
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch approved books:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBook(bookId: string | undefined) {
  return useQuery({
    queryKey: ["book", bookId],
    enabled: !!bookId,
    queryFn: async (): Promise<Book> => {
      try {
        const response = await apiClient.getBookById(bookId!);
        return response.data;
      } catch (error) {
        console.error('Failed to fetch book:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
