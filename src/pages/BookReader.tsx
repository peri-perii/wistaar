import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useBookChapters } from "@/hooks/useBookChapters";
import { useApprovedBooks } from "@/hooks/useApprovedBooks";
import { useHasPurchased } from "@/hooks/usePurchases";
import { useAuth } from "@/hooks/useAuth";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import PageFlipBook, { type PageFlipBookRef } from "@/components/reader/PageFlipBook";
import ReaderToolbar from "@/components/reader/ReaderToolbar";

export default function BookReader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: books } = useApprovedBooks();
  const { data: allChapters, isLoading } = useBookChapters(id);
  const { data: hasPurchased } = useHasPurchased(id);
  const { user } = useAuth();
  const { saveProgress } = useReadingProgress(id);
  const flipBookRef = useRef<PageFlipBookRef>(null);

  const book = books?.find((b) => b.id === id);

  const isPremium = book?.price === "premium";
  const freeChapterLimit = book?.freeChapters ?? 3;
  const isUnlocked = !isPremium || !!hasPurchased;

  const chapters = useMemo(() => {
    if (!allChapters) return undefined;
    if (isUnlocked) return allChapters;
    return allChapters.filter((ch) => ch.chapter_number <= freeChapterLimit);
  }, [allChapters, isUnlocked, freeChapterLimit]);

  const [currentPage, setCurrentPage] = useState(0);
  const [fontSize, setFontSize] = useState(17);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        onBack={() => navigate(`/book/${id}`)}
        onPrevPage={() => flipBookRef.current?.flipPrev()}
        onNextPage={() => flipBookRef.current?.flipNext()}
        onFontSizeChange={adjustFontSize}
        onToggleFullscreen={toggleFullscreen}
        onGoToChapter={goToChapter}
      />

      {/* Book */}
      <motion.div
        className={cn(
          "flex items-center justify-center transition-all duration-300",
          showControls ? "pt-14 sm:pt-16 pb-2 sm:pb-4" : "pt-2 sm:pt-4 pb-2 sm:pb-4",
          "min-h-screen"
        )}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
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
