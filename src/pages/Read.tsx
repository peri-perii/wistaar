import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { mockBooks } from "@/data/books";
import { getDailyContent } from "@/data/dailyContent";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  List, 
  Minus,
  Plus,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Highlighter,
  Search
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useBookmarks, Bookmark as BookmarkType } from "@/hooks/useBookmarks";
import { useToast } from "@/hooks/use-toast";
import BookSearch from "@/components/BookSearch";

export default function Read() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const book = mockBooks.find((b) => b.id === id);
  const chapterParam = searchParams.get("chapter");
  const initialChapterIndex = chapterParam ? parseInt(chapterParam) - 1 : 0;
  
  const [fontSize, setFontSize] = useState(18);
  const [showControls, setShowControls] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);
  
  const { progress, isLoading, saveProgress, isAuthenticated } = useReadingProgress(id);
  const { bookmarks, addBookmark, deleteBookmark } = useBookmarks(id);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [highlightPopover, setHighlightPopover] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });
  const [highlightNote, setHighlightNote] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Determine current chapter - use URL param if set, otherwise use saved progress
  const currentChapterIndex = chapterParam 
    ? parseInt(chapterParam) - 1 
    : (progress?.current_chapter ? progress.current_chapter - 1 : 0);
  
  const currentChapter = book?.chapters[currentChapterIndex];
  const totalChapters = book?.chapters.length || 0;
  const overallProgress = ((currentChapterIndex + 1) / totalChapters) * 100;

  // Restore progress on initial load
  useEffect(() => {
    if (!isLoading && progress && !chapterParam && !hasRestoredProgress) {
      setSearchParams({ chapter: progress.current_chapter.toString() });
      setHasRestoredProgress(true);
      toast({
        title: "Welcome back!",
        description: `Continuing from Chapter ${progress.current_chapter}`,
      });
    }
  }, [isLoading, progress, chapterParam, hasRestoredProgress, setSearchParams, toast]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progressPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progressPercent);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-save progress with debounce
  useEffect(() => {
    if (!isAuthenticated || !id) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save to avoid too many requests
    saveTimeoutRef.current = setTimeout(() => {
      saveProgress(currentChapterIndex + 1, scrollProgress);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentChapterIndex, scrollProgress, isAuthenticated, id, saveProgress]);

  // Scroll to top on chapter change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentChapterIndex]);

  // Handle text selection for highlighting
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      
      if (text && text.length > 0 && contentRef.current?.contains(selection?.anchorNode || null)) {
        const range = selection?.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          setSelectedText(text);
          setHighlightPopover({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
            visible: true,
          });
        }
      } else {
        // Delay hiding to allow clicking the popover
        setTimeout(() => {
          const selection = window.getSelection();
          if (!selection?.toString().trim()) {
            setHighlightPopover((prev) => ({ ...prev, visible: false }));
          }
        }, 200);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  if (!book || !currentChapter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display font-medium text-foreground mb-4">
            Chapter not found
          </h1>
          <Link to="/explore">
            <Button>Browse Books</Button>
          </Link>
        </div>
      </div>
    );
  }

  const goToChapter = (chapterNumber: number) => {
    if (chapterNumber >= 1 && chapterNumber <= totalChapters) {
      setSearchParams({ chapter: chapterNumber.toString() });
      // Immediately save when manually changing chapters
      if (isAuthenticated) {
        saveProgress(chapterNumber, 0);
      }
    }
  };

  const nextChapter = () => goToChapter(currentChapterIndex + 2);
  const prevChapter = () => goToChapter(currentChapterIndex);

  const adjustFontSize = (delta: number) => {
    setFontSize((prev) => Math.min(28, Math.max(14, prev + delta)));
  };

  const handleAddBookmark = async () => {
    const result = await addBookmark(
      currentChapterIndex + 1,
      scrollProgress,
      bookmarkNote || undefined
    );
    if (result) {
      toast({
        title: "Bookmark added",
        description: `Saved at Chapter ${currentChapterIndex + 1}`,
      });
      setBookmarkNote("");
      setBookmarkDialogOpen(false);
    }
  };

  const handleSaveHighlight = async () => {
    if (!selectedText) return;
    
    const result = await addBookmark(
      currentChapterIndex + 1,
      scrollProgress,
      highlightNote || undefined,
      selectedText
    );
    
    if (result) {
      toast({
        title: "Highlight saved",
        description: `"${selectedText.slice(0, 30)}${selectedText.length > 30 ? "..." : ""}"`,
      });
      setSelectedText("");
      setHighlightNote("");
      setHighlightPopover({ x: 0, y: 0, visible: false });
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    const success = await deleteBookmark(bookmarkId);
    if (success) {
      toast({
        title: "Bookmark removed",
      });
    }
  };

  const currentChapterBookmarks = bookmarks.filter(
    (b) => b.chapter_number === currentChapterIndex + 1
  );

  const formatBookmarkDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get daily rotating content for this chapter
  const chapterContent = getDailyContent(currentChapter.title, book.title, currentChapter.number);

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border transition-transform duration-300",
          !showControls && "-translate-y-full"
        )}
      >
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(`/book/${id}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground line-clamp-1">{book.title}</p>
              <p className="text-xs text-muted-foreground">Chapter {currentChapter.number}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Search Button */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setSearchOpen(true);
              }}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Font Size Controls */}
            <div className="hidden sm:flex items-center gap-1 mr-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => adjustFontSize(-2)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-8 text-center">{fontSize}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => adjustFontSize(2)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Bookmark Button */}
            {isAuthenticated && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setBookmarkDialogOpen(true);
                }}
                className={cn(
                  currentChapterBookmarks.length > 0 && "text-primary"
                )}
              >
                {currentChapterBookmarks.length > 0 ? (
                  <BookmarkCheck className="h-5 w-5" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </Button>
            )}

            {/* Chapter & Bookmarks Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <List className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="font-display">Navigation</SheetTitle>
                </SheetHeader>
                
                <Tabs defaultValue="chapters" className="mt-4">
                  <TabsList className="w-full">
                    <TabsTrigger value="chapters" className="flex-1">Chapters</TabsTrigger>
                    <TabsTrigger value="bookmarks" className="flex-1">
                      Bookmarks {bookmarks.length > 0 && `(${bookmarks.length})`}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="chapters">
                    <ScrollArea className="h-[calc(100vh-180px)]">
                      <div className="space-y-1">
                        {book.chapters.map((chapter, index) => (
                          <button
                            key={chapter.id}
                            onClick={() => goToChapter(chapter.number)}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-md transition-colors",
                              index === currentChapterIndex
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                          >
                            <span className="text-sm font-medium">
                              {chapter.number}. {chapter.title}
                            </span>
                            <span className="block text-xs mt-0.5 opacity-70">
                              {chapter.readingTime}
                            </span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="bookmarks">
                    <ScrollArea className="h-[calc(100vh-180px)]">
                      {bookmarks.length === 0 ? (
                        <div className="text-center py-8">
                          <Bookmark className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No bookmarks yet
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {bookmarks.map((bookmark) => (
                            <div
                              key={bookmark.id}
                              className={cn(
                                "group p-3 rounded-md border transition-colors",
                                bookmark.highlighted_text 
                                  ? "border-primary/30 bg-primary/5 hover:bg-primary/10" 
                                  : "border-border hover:bg-muted/50"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  onClick={() => goToChapter(bookmark.chapter_number)}
                                  className="text-left flex-1"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    {bookmark.highlighted_text ? (
                                      <Highlighter className="h-3 w-3 text-primary" />
                                    ) : (
                                      <Bookmark className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    <p className="text-sm font-medium text-foreground">
                                      Chapter {bookmark.chapter_number}
                                    </p>
                                  </div>
                                  {bookmark.highlighted_text && (
                                    <p className="text-sm text-foreground/80 italic border-l-2 border-primary/50 pl-2 my-2 line-clamp-3">
                                      "{bookmark.highlighted_text}"
                                    </p>
                                  )}
                                  {bookmark.note && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {bookmark.note}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatBookmarkDate(bookmark.created_at)}
                                  </p>
                                </button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDeleteBookmark(bookmark.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Progress Bar */}
        <Progress 
          value={scrollProgress} 
          className="h-0.5 rounded-none"
        />
      </header>

      {/* Main Reading Area */}
      <main 
        className="pt-20 pb-24 px-4"
        onClick={() => setShowControls((prev) => !prev)}
      >
        <article className="max-w-2xl mx-auto">
          {/* Chapter Header */}
          <header className="mb-12 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Chapter {currentChapter.number}
            </p>
            <h1 className="text-3xl md:text-4xl font-display font-medium text-foreground">
              {currentChapter.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-4">
              {currentChapter.readingTime} read
            </p>
          </header>

          {/* Chapter Content */}
          <div 
            ref={contentRef}
            className="prose-reading space-y-6 select-text"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
          >
            {chapterContent.map((paragraph, index) => (
              <p key={index} className="text-foreground/90">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Chapter End */}
          <div className="mt-16 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground mb-6">
              End of Chapter {currentChapter.number}
            </p>
            
            <div className="flex items-center justify-center gap-4">
              {currentChapterIndex > 0 && (
                <Button variant="outline" onClick={prevChapter}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              
              {currentChapterIndex < totalChapters - 1 ? (
                <Button onClick={nextChapter}>
                  Next Chapter
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button asChild>
                  <Link to={`/book/${id}`}>
                    Finish Book
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </article>
      </main>

      {/* Fixed Footer - Progress */}
      <footer 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border transition-transform duration-300",
          !showControls && "translate-y-full"
        )}
      >
        <div className="px-4 md:px-6 py-3">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={prevChapter}
                disabled={currentChapterIndex === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              
              <span className="text-sm text-muted-foreground">
                {currentChapterIndex + 1} of {totalChapters} chapters
              </span>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={nextChapter}
                disabled={currentChapterIndex === totalChapters - 1}
                className="gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <Progress value={overallProgress} className="h-1" />
          </div>
        </div>
      </footer>

      {/* Highlight Popover - appears when text is selected */}
      {highlightPopover.visible && isAuthenticated && selectedText && (
        <div
          className="fixed z-[100] animate-in fade-in-0 zoom-in-95"
          style={{
            left: `${highlightPopover.x}px`,
            top: `${highlightPopover.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
            <div className="mb-2">
              <p className="text-xs text-muted-foreground mb-1">Selected text:</p>
              <p className="text-sm italic line-clamp-2">
                "{selectedText.slice(0, 60)}{selectedText.length > 60 ? "..." : ""}"
              </p>
            </div>
            <Input
              placeholder="Add a note (optional)"
              value={highlightNote}
              onChange={(e) => setHighlightNote(e.target.value)}
              className="mb-2 h-8 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 h-8 text-xs"
                onClick={() => {
                  setHighlightPopover({ x: 0, y: 0, visible: false });
                  window.getSelection()?.removeAllRanges();
                }}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                className="flex-1 h-8 text-xs gap-1"
                onClick={handleSaveHighlight}
              >
                <Highlighter className="h-3 w-3" />
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bookmark Dialog */}
      <Dialog open={bookmarkDialogOpen} onOpenChange={setBookmarkDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="font-display">Add Bookmark</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Bookmark at Chapter {currentChapterIndex + 1}: {currentChapter.title}
            </p>
            <Input
              placeholder="Add a note (optional)"
              value={bookmarkNote}
              onChange={(e) => setBookmarkNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookmarkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBookmark}>
              Save Bookmark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book Search */}
      <BookSearch 
        book={book} 
        isOpen={searchOpen} 
        onClose={() => setSearchOpen(false)} 
      />
    </div>
  );
}

