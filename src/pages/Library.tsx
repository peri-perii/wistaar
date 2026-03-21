import { useMemo, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { BookOpen, Library as LibraryIcon, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAllReadingProgress, ReadingProgress } from "@/hooks/useReadingProgress";
import { mockBooks } from "@/data/books";
import { usePurchases } from "@/hooks/usePurchases";
import { useApprovedBooks } from "@/hooks/useApprovedBooks";
import { useWishlist } from "@/hooks/useWishlist";
import SearchBar from "@/components/SearchBar";
import FilterSelect from "@/components/FilterSelect";
import LibraryStats from "@/components/library/LibraryStats";
import PurchasedBookCard from "@/components/library/PurchasedBookCard";
import ContinueReadingCard, { type LibraryBookWithProgress } from "@/components/library/ContinueReadingCard";
import WishlistButton from "@/components/WishlistButton";
import { toast } from "sonner";

interface PurchasedBook {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  coverImageUrl: string | null;
  priceAmount: number;
  purchasedAt: string;
  genre: string;
}

const statusFilters = ["All", "In Progress", "Completed", "Purchased", "Wishlist"] as const;

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 200, damping: 24 } },
};

export default function Library() {
  const { user, loading: authLoading } = useAuth();
  const { allProgress, isLoading } = useAllReadingProgress();
  const { data: purchases, isLoading: purchasesLoading } = usePurchases();
  const { data: approvedBooks } = useApprovedBooks();
  const { data: wishlistItems } = useWishlist();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("library-archived");
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const handleArchive = useCallback((bookId: string) => {
    setArchivedIds((prev) => {
      const next = new Set(prev);
      next.add(bookId);
      localStorage.setItem("library-archived", JSON.stringify([...next]));
      return next;
    });
    toast.success("Book hidden from library");
  }, []);

  const purchasedBooks = useMemo(() => {
    if (!purchases || !approvedBooks) return [];
    return purchases
      .map((p) => {
        const book = approvedBooks.find((b) => b.id === p.book_id);
        if (!book) return null;
        return {
          id: book.id,
          title: book.title,
          author: book.author,
          coverColor: book.coverColor,
          coverImageUrl: book.coverImageUrl,
          priceAmount: book.priceAmount,
          purchasedAt: p.purchased_at,
          genre: book.genre,
        } as PurchasedBook;
      })
      .filter(Boolean) as PurchasedBook[];
  }, [purchases, approvedBooks]);

  // Build unified progress list from both mock books AND approved (DB) books
  const booksWithProgress = useMemo(() => {
    return allProgress
      .map((progress): LibraryBookWithProgress | null => {
        // Try mock books first
        const mock = mockBooks.find((b) => b.id === progress.book_id);
        if (mock) {
          const progressPercent = Math.min(100, (progress.current_chapter / mock.chapters.length) * 100);
          return {
            id: mock.id,
            title: mock.title,
            author: mock.author,
            totalChapters: mock.chapters.length,
            coverColor: mock.coverColor,
            progress,
            progressPercent,
          };
        }
        // Try approved books from DB
        const approved = approvedBooks?.find((b) => b.id === progress.book_id);
        if (approved) {
          const total = approved.totalChapters || 1;
          const progressPercent = Math.min(100, (progress.current_chapter / total) * 100);
          return {
            id: approved.id,
            title: approved.title,
            author: approved.author,
            totalChapters: total,
            coverColor: approved.coverColor,
            coverImageUrl: approved.coverImageUrl,
            progress,
            progressPercent,
          };
        }
        return null;
      })
      .filter((b): b is LibraryBookWithProgress => b !== null && !archivedIds.has(b.id))
      .sort((a, b) => new Date(b.progress.last_read_at).getTime() - new Date(a.progress.last_read_at).getTime());
  }, [allProgress, archivedIds, approvedBooks]);

  const filteredProgress = useMemo(() => {
    let list = booksWithProgress;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    }
    if (statusFilter === "In Progress") list = list.filter((b) => b.progressPercent < 100);
    if (statusFilter === "Completed") list = list.filter((b) => b.progressPercent >= 100);
    if (statusFilter === "Purchased" || statusFilter === "Wishlist") list = [];
    return list;
  }, [booksWithProgress, search, statusFilter]);

  const wishlistBooks = useMemo(() => {
    if (!wishlistItems || !approvedBooks) return [];
    return wishlistItems
      .map((w) => {
        const book = approvedBooks.find((b) => b.id === w.book_id);
        if (!book) return null;
        return book;
      })
      .filter(Boolean) as typeof approvedBooks;
  }, [wishlistItems, approvedBooks]);

  const filteredWishlist = useMemo(() => {
    if (statusFilter !== "All" && statusFilter !== "Wishlist") return [];
    let list = wishlistBooks;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    }
    return list;
  }, [wishlistBooks, search, statusFilter]);

  const filteredPurchased = useMemo(() => {
    if (statusFilter === "In Progress" || statusFilter === "Completed") return [];
    let list = purchasedBooks;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    }
    return list;
  }, [purchasedBooks, search, statusFilter]);

  const completedCount = booksWithProgress.filter((b) => b.progressPercent >= 100).length;
  const inProgressCount = booksWithProgress.filter((b) => b.progressPercent < 100).length;

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const anyLoading = isLoading || authLoading || purchasesLoading;
  const hasBooks = booksWithProgress.length > 0 || purchasedBooks.length > 0 || wishlistBooks.length > 0;
  const hasFilteredResults = filteredProgress.length > 0 || filteredPurchased.length > 0 || filteredWishlist.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-20 sm:pt-24 pb-12 sm:pb-16">
        <div className="container-editorial px-4 sm:px-6">
          {/* Header */}
          <motion.div
            className="mb-6 sm:mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-medium text-foreground mb-2 sm:mb-4">
              My Library
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Continue where you left off or start something new.
            </p>
          </motion.div>

          {/* Stats */}
          {!anyLoading && (
            <LibraryStats
              totalBooks={booksWithProgress.length}
              completedBooks={completedCount}
              inProgressBooks={inProgressCount}
              purchasedCount={purchasedBooks.length}
            />
          )}

          {/* Search & Filter */}
          {!anyLoading && hasBooks && (
            <motion.div
              className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
            >
              <div className="flex-1">
                <SearchBar value={search} onChange={setSearch} placeholder="Search your library..." />
              </div>
              <div className="w-full sm:w-48">
                <FilterSelect
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={statusFilters}
                  placeholder="Status"
                />
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {anyLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-lg p-5 sm:p-6 animate-pulse">
                  <div className="aspect-[3/2] bg-muted rounded-md mb-4" />
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!anyLoading && !hasBooks && (
            <motion.div
              className="text-center py-16 sm:py-20"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 sm:mb-6 rounded-full bg-muted flex items-center justify-center">
                <LibraryIcon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-medium text-foreground mb-3">
                Your library is empty
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto">
                Start reading a book and it will appear here. Your progress will be saved automatically.
              </p>
              <Link to="/explore">
                <Button size="lg" className="gap-2">
                  <BookOpen className="h-5 w-5" />
                  Explore Books
                </Button>
              </Link>
            </motion.div>
          )}

          {/* No filter results */}
          {!anyLoading && hasBooks && !hasFilteredResults && (search || statusFilter !== "All") && (
            <motion.div
              className="text-center py-12 sm:py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-muted-foreground">No books match your search or filter.</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearch(""); setStatusFilter("All"); }}>
                Clear Filters
              </Button>
            </motion.div>
          )}

          {/* Books Grid */}
          <AnimatePresence mode="wait">
            {!anyLoading && hasFilteredResults && (
              <motion.div
                key={`${statusFilter}-${search}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {filteredPurchased.length > 0 && (
                  <motion.section className="mb-8 sm:mb-12" variants={sectionVariants} initial="hidden" animate="visible">
                    <h2 className="text-lg sm:text-xl font-display font-medium text-foreground mb-4 sm:mb-6">
                      Purchased Books
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {filteredPurchased.map((book, i) => (
                        <PurchasedBookCard key={book.id} book={book} index={i} />
                      ))}
                    </div>
                  </motion.section>
                )}

                {filteredProgress.length > 0 && (
                  <motion.section className="mb-8 sm:mb-12" variants={sectionVariants} initial="hidden" animate="visible">
                    <h2 className="text-lg sm:text-xl font-display font-medium text-foreground mb-4 sm:mb-6">
                      {statusFilter === "Completed" ? "Completed Books" : "Continue Reading"}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      <AnimatePresence>
                        {filteredProgress.map((book, i) => (
                          <ContinueReadingCard key={book.id} book={book} index={i} onArchive={handleArchive} />
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.section>
                )}

                {/* Wishlist Section */}
                {filteredWishlist.length > 0 && (
                  <motion.section className="mb-8 sm:mb-12" variants={sectionVariants} initial="hidden" animate="visible">
                    <h2 className="text-lg sm:text-xl font-display font-medium text-foreground mb-4 sm:mb-6 flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-500" /> Wishlist
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {filteredWishlist.map((book, i) => (
                        <Link key={book.id} to={`/book/${book.id}`}>
                          <motion.div
                            className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <div className={`${book.coverColor} aspect-[16/9] relative overflow-hidden`}>
                              {book.coverImageUrl && (
                                <img src={book.coverImageUrl} alt={book.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                              )}
                              <div className="absolute top-3 right-3">
                                <WishlistButton bookId={book.id} />
                              </div>
                            </div>
                            <div className="p-4">
                              <h3 className="font-medium text-foreground line-clamp-1">{book.title}</h3>
                              <p className="text-sm text-muted-foreground">{book.author}</p>
                              <p className="text-xs text-muted-foreground mt-1 capitalize">{book.genre}</p>
                            </div>
                          </motion.div>
                        </Link>
                      ))}
                    </div>
                  </motion.section>
                )}

                <motion.section
                  className="pt-6 sm:pt-8 border-t border-border"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-display font-medium text-foreground">
                      Discover More
                    </h2>
                    <Link to="/explore">
                      <Button variant="ghost" size="sm">View All</Button>
                    </Link>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Explore our collection and find your next read.
                  </p>
                </motion.section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
