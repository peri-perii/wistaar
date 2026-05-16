import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BookChapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string;
}

export function useBookChapters(bookId: string | undefined) {
  return useQuery({
    queryKey: ["book-chapters", bookId],
    enabled: !!bookId,
    queryFn: async (): Promise<BookChapter[]> => {
      const { data, error } = await supabase
        .from("book_chapters")
        .select("*")
        .eq("book_id", bookId!)
        .order("chapter_number", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as BookChapter[];
    },
  });
}
