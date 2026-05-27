import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useBookChapters } from "@/hooks/useBookChapters";
import { useApprovedBooks } from "@/hooks/useApprovedBooks";
import { useHasPurchased } from "@/hooks/usePurchases";
import { useAuth } from "@/hooks/useAuth";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { Button } from "@/components/ui/button";
import { BookOpen, IndianRupee, ShoppingCart, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import PageFlipBook, { type PageFlipBookRef } from "@/components/reader/PageFlipBook";
import ReaderToolbar from "@/components/reader/ReaderToolbar";
import { Link } from "react-router-dom";

export default function BookReader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: books } = useApprovedBooks();
  const { data: allChapters, isLoading } = useBookChapters(id);
  const { data: hasPurchased } = useHasPurchased(id);
  const { user } = useAuth();
  const { saveProgress } = useReadingProgress(id);
  const flipBookRef = useRef<PageFlipBookRef>(null);

  const [localBook, setLocalBook] = useState<any>(null);

  useEffect(() => {
    if (!id || books?.some((b) => b.id === id)) return;
    
    // Fetch details dynamically from book_submissions for draft/preview access
    supabase
      .from("book_submissions")
      .select("*")
      .eq("id", id)
      .single()
      .then(async ({ data: s }) => {
        if (s) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", s.author_id)
            .single();

          setLocalBook({
            id: s.id,
            title: s.title,
            author: profile?.display_name || "Author",
            genre: s.genre,
            price: s.price > 0 ? "premium" : "free",
            priceAmount: Number(s.price),
            freeChapters: s.free_chapters,
            coverImageUrl: s.cover_image_url,
            description: s.description,
          });
        }
      });
  }, [id, books]);

  const book = books?.find((b) => b.id === id) || localBook;

  const isPremium = book?.price === "premium";
  const freeChapterLimit = book?.freeChapters ?? 3;
  // If the current logged-in user is the author of this book, unlock it fully for preview
  const isAuthor = localBook || books?.find((b) => b.id === id)?.author === user?.name;
  const isUnlocked = !isPremium || !!hasPurchased || !!isAuthor;

  const chapters = useMemo(() => {
    if (!allChapters) return undefined;
    if (isUnlocked) return allChapters;
    return allChapters.filter((ch) => ch.chapter_number <= freeChapterLimit);
  }, [allChapters, isUnlocked, freeChapterLimit]);

  const [currentPage, setCurrentPage] = useState(0);
  const [fontSize, setFontSize] = useState(17);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [animationMode, setAnimationMode] = useState<"flip" | "scroll">(
    () => (localStorage.getItem("reader-animation-mode") as "flip" | "scroll") || "flip"
  );
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleAnimationMode = useCallback(() => {
    setAnimationMode((prev) => {
      const next = prev === "flip" ? "scroll" : "flip";
      localStorage.setItem("reader-animation-mode", next);
      return next;
    });
  }, []);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isFullscreen) setShowControls(false);
    }, 4000);
  }, [isFullscreen]);

  useEffect(() => {
    const handleMouseMove = () => resetControlsTimer();
    const handleTouch = () => resetControlsTimer();
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouch);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [resetControlsTimer]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        flipBookRef.current?.flipNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        flipBookRef.current?.flipPrev();
      } else if (e.key === "Escape" && isFullscreen) {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const lastSavedChapterRef = useRef<number>(0);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    resetControlsTimer();

    // Save reading progress for the current chapter
    if (chapters && chapters.length > 0) {
      const totalPages = flipBookRef.current?.getTotalPages() || 1;
      const pagesPerChapter = totalPages / chapters.length;
      const chapterNum = Math.min(chapters.length, Math.floor(page / pagesPerChapter) + 1);
      if (chapterNum !== lastSavedChapterRef.current) {
        lastSavedChapterRef.current = chapterNum;
        saveProgress(chapterNum, page);
      }
    }
  }, [resetControlsTimer, chapters, saveProgress]);

  const adjustFontSize = useCallback((delta: number) => {
    setFontSize((prev) => Math.min(26, Math.max(14, prev + delta)));
  }, []);

  const getCurrentChapter = useCallback(() => {
    if (!chapters || chapters.length === 0) return 1;
    const totalPages = flipBookRef.current?.getTotalPages() || 1;
    const pagesPerChapter = totalPages / chapters.length;
    return Math.min(chapters.length, Math.floor(currentPage / pagesPerChapter) + 1);
  }, [chapters, currentPage]);

  const goToChapter = useCallback((chapterNumber: number) => {
    const page = flipBookRef.current?.getChapterStartPage(chapterNumber);
    if (page !== undefined && page >= 0) {
      flipBookRef.current?.flipTo(page);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/40 mx-auto mb-4 animate-pulse" />
          <p className="text-sm sm:text-base text-muted-foreground">Loading book...</p>
        </motion.div>
      </div>
    );
  }

  if (!chapters || chapters.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="text-center max-w-md mx-auto px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <BookOpen className="w-14 h-14 sm:w-16 sm:h-16 text-muted-foreground/30 mx-auto mb-6" />
          <h1 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
            Content not available yet
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-8">
            This book's content is being processed. Please check back shortly.
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-[#f0ece4] dark:bg-[#111] transition-colors duration-300 select-none",
        isFullscreen && "cursor-none"
      )}
      onMouseMove={() => {
        if (isFullscreen) {
          document.body.style.cursor = "default";
          resetControlsTimer();
        }
      }}
      onClick={() => setShowControls((prev) => !prev)}
    >
      {/* Toolbar */}
      <ReaderToolbar
        bookTitle={book?.title || "Book"}
        currentChapter={getCurrentChapter()}
        totalPages={flipBookRef.current?.getTotalPages() || chapters.length}
        currentPage={currentPage}
        fontSize={fontSize}
        isFullscreen={isFullscreen}
        visible={showControls}
        chapters={chapters}
        animationMode={animationMode}
        onBack={() => navigate(`/book/${id}`)}
        onPrevPage={() => flipBookRef.current?.flipPrev()}
        onNextPage={() => flipBookRef.current?.flipNext()}
        onFontSizeChange={adjustFontSize}
        onToggleFullscreen={toggleFullscreen}
        onGoToChapter={goToChapter}
        onToggleAnimationMode={toggleAnimationMode}
      />

        <AnimatePresence mode="wait">
          {animationMode === "flip" ? (
            <motion.div
              key="flip"
              className={cn(
                "flex items-center justify-center transition-all duration-300",
                showControls ? "pt-14 sm:pt-16 pb-2 sm:pb-4" : "pt-2 sm:pt-4 pb-2 sm:pb-4",
                "min-h-screen"
              )}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="w-full max-w-[1100px] mx-auto px-2 sm:px-4"
                style={{ height: "calc(100vh - 80px)" }}
              >
                <PageFlipBook
                  ref={flipBookRef}
                  chapters={chapters}
                  fontSize={fontSize}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  bookTitle={book?.title || "Book"}
                  bookId={id}
                  isPremiumLocked={isPremium && !isUnlocked}
                  priceAmount={book?.priceAmount}
                />
              </div>
            </motion.div>
          ) : (
            // ── Scroll mode ──
            <motion.div
              key="scroll"
              className={cn(
                "transition-all duration-300",
                showControls ? "pt-16 sm:pt-20" : "pt-4"
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-w-[680px] mx-auto px-6 pb-24">
                {chapters.map((chapter, ci) => (
                  <div key={chapter.id} className="mb-16" id={`chapter-${chapter.chapter_number}`}>
                    {/* Chapter header */}
                    <div className="text-center mb-10 py-8 border-b border-border/30">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
                        Chapter {chapter.chapter_number}
                      </p>
                      <h2
                        className="font-serif text-foreground leading-tight"
                        style={{ fontSize: `${fontSize + 8}px` }}
                      >
                        {chapter.title}
                      </h2>
                    </div>
                    {/* Chapter content */}
                    <div
                      className="font-serif text-foreground/90 leading-[1.9] whitespace-pre-line"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {chapter.content}
                    </div>
                  </div>
                ))}

                {/* Paywall in scroll mode */}
                {isPremium && !isUnlocked && (
                  <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                      <Lock className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-serif text-xl text-foreground mb-2">Free preview ends here</h3>
                    <p className="text-muted-foreground text-sm mb-7 max-w-sm mx-auto">
                      Purchase this book to continue reading all chapters.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link to={`/book/${id}`}>
                        <Button size="lg" className="gap-2">
                          <IndianRupee className="h-4 w-4" />
                          Buy for ₹{book?.priceAmount || 0}
                        </Button>
                      </Link>
                      <Link to={`/book/${id}`}>
                        <Button variant="outline" size="lg" className="gap-2">
                          <ShoppingCart className="h-4 w-4" />
                          Back to Book
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Tap zones for mobile */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <button
          className="absolute left-0 top-14 sm:top-16 bottom-0 w-1/4 sm:w-1/5 pointer-events-auto opacity-0 active:bg-black/5 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            flipBookRef.current?.flipPrev();
          }}
          aria-label="Previous page"
        />
        <button
          className="absolute right-0 top-14 sm:top-16 bottom-0 w-1/4 sm:w-1/5 pointer-events-auto opacity-0 active:bg-black/5 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            flipBookRef.current?.flipNext();
          }}
          aria-label="Next page"
        />
      </div>
    </div>
  );
}
