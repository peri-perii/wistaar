import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface ReadingProgress {
  book_id: string;
  current_chapter: number;
  scroll_position: number;
  last_read_at: string;
}

export function useReadingProgress(bookId: string | undefined) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !bookId) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      const { data, error } = await supabase
        .from("reading_progress")
        .select("book_id, current_chapter, scroll_position, last_read_at")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .maybeSingle();

      if (!error && data) {
        setProgress({
          book_id: data.book_id,
          current_chapter: data.current_chapter,
          scroll_position: data.scroll_position ?? 0,
          last_read_at: data.last_read_at,
        });
      }
      setIsLoading(false);
    };

    load();
  }, [user, bookId]);

  const saveProgress = useCallback(
    async (chapter: number, scrollPosition: number = 0) => {
      if (!user || !bookId) return;

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("reading_progress")
        .upsert(
          {
            user_id: user.id,
            book_id: bookId,
            current_chapter: chapter,
            scroll_position: scrollPosition,
            last_read_at: now,
          },
          { onConflict: "user_id,book_id" }
        );

      if (!error) {
        setProgress({
          book_id: bookId,
          current_chapter: chapter,
          scroll_position: scrollPosition,
          last_read_at: now,
        });
      } else {
        console.error("Failed to save reading progress:", error);
      }
    },
    [user, bookId]
  );

  return {
    progress,
    isLoading,
    saveProgress,
    isAuthenticated: !!user,
  };
}

export function useAllReadingProgress() {
  const { user } = useAuth();
  const [allProgress, setAllProgress] = useState<ReadingProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      const { data, error } = await supabase
        .from("reading_progress")
        .select("book_id, current_chapter, scroll_position, last_read_at")
        .eq("user_id", user.id);

      if (!error && data) {
        setAllProgress(
          data.map((d) => ({
            book_id: d.book_id,
            current_chapter: d.current_chapter,
            scroll_position: d.scroll_position ?? 0,
            last_read_at: d.last_read_at,
          }))
        );
      }
      setIsLoading(false);
    };

    load();
  }, [user]);

  return { allProgress, isLoading };
}
