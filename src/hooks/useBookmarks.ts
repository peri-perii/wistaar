import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface Bookmark {
  id: string;
  book_id: string;
  chapter_number: number;
  scroll_position: number;
  note: string | null;
  highlighted_text: string | null;
  created_at: string;
}

export function useBookmarks(bookId: string | undefined) {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !bookId) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("id, book_id, chapter_number, scroll_position, note, highlighted_text, created_at")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setBookmarks(
          data.map((b) => ({
            ...b,
            scroll_position: Number(b.scroll_position ?? 0),
          }))
        );
      }
      setIsLoading(false);
    };

    load();
  }, [user, bookId]);

  const addBookmark = useCallback(
    async (
      chapterNumber: number,
      scrollPosition: number = 0,
      note?: string,
      highlightedText?: string
    ): Promise<Bookmark | null> => {
      if (!user || !bookId) return null;

      const { data, error } = await supabase
        .from("bookmarks")
        .insert({
          user_id: user.id,
          book_id: bookId,
          chapter_number: chapterNumber,
          scroll_position: scrollPosition,
          note: note || null,
          highlighted_text: highlightedText || null,
        })
        .select("id, book_id, chapter_number, scroll_position, note, highlighted_text, created_at")
        .single();

      if (!error && data) {
        const bookmark: Bookmark = { ...data, scroll_position: Number(data.scroll_position ?? 0) };
        setBookmarks((prev) => [bookmark, ...prev]);
        return bookmark;
      }
      console.error("Failed to add bookmark:", error);
      return null;
    },
    [user, bookId]
  );

  const updateBookmark = useCallback(
    async (bookmarkId: string, note: string): Promise<boolean> => {
      if (!user) return false;

      const { error } = await supabase
        .from("bookmarks")
        .update({ note })
        .eq("id", bookmarkId)
        .eq("user_id", user.id);

      if (!error) {
        setBookmarks((prev) =>
          prev.map((b) => (b.id === bookmarkId ? { ...b, note } : b))
        );
        return true;
      }
      console.error("Failed to update bookmark:", error);
      return false;
    },
    [user]
  );

  const deleteBookmark = useCallback(
    async (bookmarkId: string): Promise<boolean> => {
      if (!user) return false;

      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", bookmarkId)
        .eq("user_id", user.id);

      if (!error) {
        setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
        return true;
      }
      console.error("Failed to delete bookmark:", error);
      return false;
    },
    [user]
  );

  return {
    bookmarks,
    isLoading,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    isAuthenticated: !!user,
  };
}

export function useAllBookmarks() {
  const { user } = useAuth();
  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("id, book_id, chapter_number, scroll_position, note, highlighted_text, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAllBookmarks(
          data.map((b) => ({
            ...b,
            scroll_position: Number(b.scroll_position ?? 0),
          }))
        );
      }
      setIsLoading(false);
    };

    load();
  }, [user]);

  return { allBookmarks, isLoading };
}
