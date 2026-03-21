import { forwardRef, useCallback, useMemo, useRef, useImperativeHandle } from "react";
import { Link } from "react-router-dom";
import HTMLFlipBook from "react-pageflip";
import { Lock, IndianRupee, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookChapter } from "@/hooks/useBookChapters";

interface PageFlipBookProps {
  chapters: BookChapter[];
  fontSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  bookTitle: string;
  bookId?: string;
  isPremiumLocked?: boolean;
  priceAmount?: number;
}

// Split chapter content into pages that fit the viewport
function splitIntoPages(
  chapters: BookChapter[],
  charsPerPage: number
): { chapterNumber: number; chapterTitle: string; content: string; pageInChapter: number; totalPagesInChapter: number }[] {
  const pages: { chapterNumber: number; chapterTitle: string; content: string; pageInChapter: number; totalPagesInChapter: number }[] = [];

  for (const chapter of chapters) {
    // Add a title page for each chapter
    pages.push({
      chapterNumber: chapter.chapter_number,
      chapterTitle: chapter.title,
      content: "",
      pageInChapter: 0,
      totalPagesInChapter: 0,
    });

    const paragraphs = chapter.content.split(/\n\n+/);
    let currentPageContent = "";
    const chapterPages: string[] = [];

    for (const para of paragraphs) {
      if ((currentPageContent + "\n\n" + para).length > charsPerPage && currentPageContent) {
        chapterPages.push(currentPageContent.trim());
        currentPageContent = para;
      } else {
        currentPageContent += (currentPageContent ? "\n\n" : "") + para;
      }
    }
    if (currentPageContent.trim()) {
      chapterPages.push(currentPageContent.trim());
    }

    // Update chapter title page with total
    const titlePageIndex = pages.length - 1;

    for (let i = 0; i < chapterPages.length; i++) {
      pages.push({
        chapterNumber: chapter.chapter_number,
        chapterTitle: chapter.title,
        content: chapterPages[i],
        pageInChapter: i + 1,
        totalPagesInChapter: chapterPages.length,
      });
    }

    pages[titlePageIndex].totalPagesInChapter = chapterPages.length;
  }

  return pages;
}

// Individual page component - must use forwardRef for react-pageflip
const Page = forwardRef<HTMLDivElement, { 
  pageData: ReturnType<typeof splitIntoPages>[number];
  pageNumber: number;
  totalPages: number;
  fontSize: number;
  bookTitle: string;
}>(({ pageData, pageNumber, totalPages, fontSize, bookTitle }, ref) => {
  const isChapterTitle = pageData.content === "";

  return (
    <div
      ref={ref}
      className="bg-[#faf8f5] dark:bg-[#1a1a1a] h-full w-full overflow-hidden shadow-inner"
      style={{ padding: "clamp(16px, 4%, 40px)" }}
    >
      {isChapterTitle ? (
        // Chapter title page
        <div className="h-full flex flex-col items-center justify-center text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">
            Chapter {pageData.chapterNumber}
          </p>
          <h2
            className="font-serif text-2xl md:text-3xl text-foreground leading-tight mb-4"
            style={{ fontSize: `${fontSize + 8}px` }}
          >
            {pageData.chapterTitle}
          </h2>
          <div className="w-16 h-px bg-border mt-6" />
        </div>
      ) : (
        // Content page
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-border/30">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {bookTitle}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
              Ch. {pageData.chapterNumber}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div
              className="leading-relaxed text-foreground/90 whitespace-pre-line font-serif"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
            >
              {pageData.content}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-2 border-t border-border/30 text-center">
            <span className="text-[10px] text-muted-foreground/50">
              {pageNumber + 1}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
// Paywall page component
const PaywallPage = forwardRef<HTMLDivElement, { bookId?: string; priceAmount?: number }>(
  ({ bookId, priceAmount }, ref) => (
    <div
      ref={ref}
      className="bg-[#faf8f5] dark:bg-[#1a1a1a] h-full w-full overflow-hidden shadow-inner"
      style={{ padding: "clamp(16px, 4%, 40px)" }}
    >
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-serif text-2xl text-foreground mb-3">
          Free preview ends here
        </h2>
        <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
          You've reached the end of the free chapters. Purchase this book to continue reading.
        </p>
        <div className="flex flex-col gap-3">
          <Link to={`/book/${bookId}`}>
            <Button size="lg" className="gap-2 w-full">
              <IndianRupee className="h-4 w-4" />
              Buy for ₹{priceAmount || 0}
            </Button>
          </Link>
          <Link to={`/book/${bookId}`}>
            <Button variant="outline" size="lg" className="gap-2 w-full">
              <ShoppingCart className="h-4 w-4" />
              Back to Book Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
);
PaywallPage.displayName = "PaywallPage";

Page.displayName = "Page";

export interface PageFlipBookRef {
  flipNext: () => void;
  flipPrev: () => void;
  flipTo: (page: number) => void;
  getTotalPages: () => number;
  getChapterStartPage: (chapterNumber: number) => number;
}

const PageFlipBook = forwardRef<PageFlipBookRef, PageFlipBookProps>(
  ({ chapters, fontSize, currentPage, onPageChange, bookTitle, bookId, isPremiumLocked, priceAmount }, ref) => {
    const flipBookRef = useRef<any>(null);
    const charsPerPage = fontSize <= 16 ? 1200 : fontSize <= 20 ? 900 : 650;

    const pages = useMemo(
      () => splitIntoPages(chapters, charsPerPage),
      [chapters, charsPerPage]
    );

    const getChapterStartPage = useCallback(
      (chapterNumber: number) => {
        return pages.findIndex((p) => p.chapterNumber === chapterNumber && p.content === "");
      },
      [pages]
    );

    useImperativeHandle(ref, () => ({
      flipNext: () => flipBookRef.current?.pageFlip()?.flipNext(),
      flipPrev: () => flipBookRef.current?.pageFlip()?.flipPrev(),
      flipTo: (page: number) => flipBookRef.current?.pageFlip()?.flip(page),
      getTotalPages: () => pages.length + (isPremiumLocked ? 1 : 0),
      getChapterStartPage,
    }));

    const handleFlip = useCallback(
      (e: any) => {
        onPageChange(e.data);
      },
      [onPageChange]
    );

    if (pages.length === 0) return null;

    // Build all page elements upfront — react-pageflip cannot handle conditional children
    const allPages = pages.map((pageData, i) => (
      <Page
        key={i}
        pageData={pageData}
        pageNumber={i}
        totalPages={pages.length}
        fontSize={fontSize}
        bookTitle={bookTitle}
      />
    ));

    if (isPremiumLocked) {
      allPages.push(
        <PaywallPage key="paywall" bookId={bookId} priceAmount={priceAmount} />
      );
    }

    return (
      <div className="flex items-center justify-center w-full h-full">
        {/* @ts-ignore - react-pageflip types */}
        <HTMLFlipBook
          ref={flipBookRef}
          width={500}
          height={700}
          size="stretch"
          minWidth={280}
          maxWidth={600}
          minHeight={400}
          maxHeight={900}
          showCover={false}
          mobileScrollSupport={true}
          onFlip={handleFlip}
          startPage={currentPage}
          drawShadow={true}
          flippingTime={600}
          useMouseEvents={true}
          swipeDistance={30}
          clickEventForward={false}
          usePortrait={true}
          startZIndex={0}
          autoSize={true}
          maxShadowOpacity={0.3}
          showPageCorners={true}
          disableFlipByClick={false}
          className="book-flip-container"
          style={{}}
        >
          {allPages}
        </HTMLFlipBook>
      </div>
    );
  }
);
PageFlipBook.displayName = "PageFlipBook";

export default PageFlipBook;
