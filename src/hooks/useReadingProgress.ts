import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReadingProgress {
  book_id: string;
  current_chapter: number;
  scroll_position: number;
  last_read_at: string;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsKey(bookId: string) {
  return `reading-progress-${bookId}`;
}

function saveToLocalStorage(bookId: string, progress: Omit<ReadingProgress, 'book_id'>) {
  try {
    localStorage.setItem(lsKey(bookId), JSON.stringify(progress));
  } catch {
    // Storage might be full — fail silently
  }
}

function loadFromLocalStorage(bookId: string): ReadingProgress | null {
  try {
    const raw = localStorage.getItem(lsKey(bookId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { book_id: bookId, ...parsed };
  } catch {
    return null;
  }
}

// ─── Single-book progress hook ────────────────────────────────────────────────

export function useReadingProgress(bookId: string | undefined) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep a ref to the latest progress for use inside event listeners/intervals
  const progressRef = useRef<ReadingProgress | null>(null);
  progressRef.current = progress;

  // ── Load: Supabase first, localStorage fallback ──────────────────────────
  useEffect(() => {
    if (!bookId) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      // 1. Try Supabase (only if authenticated)
      if (user) {
        const { data, error } = await supabase
          .from("reading_progress")
          .select("book_id, current_chapter, scroll_position, last_read_at")
          .eq("user_id", user.id)
          .eq("book_id", bookId)
          .maybeSingle();

        if (!error && data) {
          const prog: ReadingProgress = {
            book_id: data.book_id,
            current_chapter: data.current_chapter,
            scroll_position: data.scroll_position ?? 0,
            last_read_at: data.last_read_at,
          };
          setProgress(prog);
          // Keep localStorage in sync
          saveToLocalStorage(bookId, {
            current_chapter: prog.current_chapter,
            scroll_position: prog.scroll_position,
            last_read_at: prog.last_read_at,
          });
          setIsLoading(false);
          return;
        }
      }

      // 2. Fallback to localStorage
      const cached = loadFromLocalStorage(bookId);
      if (cached) setProgress(cached);
      setIsLoading(false);
    };

    load();
  }, [user, bookId]);

  // ── Save helper ───────────────────────────────────────────────────────────
  const saveProgress = useCallback(
    async (chapter: number, scrollPosition = 0) => {
      if (!bookId) return;

      const now = new Date().toISOString();
      const next: ReadingProgress = {
        book_id: bookId,
        current_chapter: chapter,
        scroll_position: scrollPosition,
        last_read_at: now,
      };

      // Always write to localStorage immediately (works offline, survives auth gaps)
      saveToLocalStorage(bookId, {
        current_chapter: chapter,
        scroll_position: scrollPosition,
        last_read_at: now,
      });

      // Optimistically update state
      setProgress(next);

      // Write to Supabase if authenticated
      if (user) {
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

        if (error) {
          console.error("Failed to save reading progress to Supabase:", error);
        }
      }
    },
    [user, bookId]
  );

  // ── Auto-save every 30 seconds ────────────────────────────────────────────
  useEffect(() => {
    if (!bookId) return;

    const interval = setInterval(() => {
      const p = progressRef.current;
      if (p) {
        saveProgress(p.current_chapter, p.scroll_position);
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [bookId, saveProgress]);

  // ── Save on page unload ───────────────────────────────────────────────────
  useEffect(() => {
    if (!bookId) return;

    const handleUnload = () => {
      const p = progressRef.current;
      if (!p) return;
      // Synchronous localStorage write always works on unload
      saveToLocalStorage(bookId, {
        current_chapter: p.current_chapter,
        scroll_position: p.scroll_position,
        last_read_at: new Date().toISOString(),
      });
      // Best-effort Supabase beacon (non-blocking; may not complete)
      if (user) {
        void supabase.from("reading_progress").upsert(
          {
            user_id: user.id,
            book_id: bookId,
            current_chapter: p.current_chapter,
            scroll_position: p.scroll_position,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: "user_id,book_id" }
        );
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [bookId, user]);

  return {
    progress,
    isLoading,
    saveProgress,
    isAuthenticated: !!user,
  };
}

// ─── All-progress hook (used by Library) ─────────────────────────────────────

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
