import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchBar from "@/components/SearchBar";
import FilterSelect from "@/components/FilterSelect";
import ExploreBookCard from "@/components/ExploreBookCard";
import ApprovedBookCard from "@/components/ApprovedBookCard";
import { mockBooks, genres, sortOptions } from "@/data/books";
import { useApprovedBooks } from "@/hooks/useApprovedBooks";

type PriceFilter = "all" | "free" | "premium";

const Explore = () => {
  const { data: approvedBooks = [], isLoading } = useApprovedBooks();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All Genres");
  const [selectedAuthor, setSelectedAuthor] = useState("All Authors");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [showFilters, setShowFilters] = useState(false);

  // Combine approved books with mock books as fallback
  const allBooks = useMemo(() => {
    if (approvedBooks.length > 0) {
      // Map approved books to a common shape for filtering
      return approvedBooks.map((b) => ({
        ...b,
        isApproved: true as const,
        publishedDate: b.publishedDate,
      }));
    }
    // Fallback to mock data when no approved books
    return mockBooks.map((b) => ({
      ...b,
      isApproved: false as const,
      priceAmount: 0,
      freeChapters: 0,
      coverImageUrl: null,
      readCount: 0,
      totalChapters: b.chapters.length,
    }));
  }, [approvedBooks]);

  // Dynamic authors list
  const authors = useMemo(() => {
    const uniqueAuthors = [...new Set(allBooks.map((b) => b.author))];
    return ["All Authors", ...uniqueAuthors.sort()];
  }, [allBooks]);

  const filteredBooks = useMemo(() => {
    let result = [...allBooks];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query) ||
          book.genre.toLowerCase().includes(query)
      );
    }

    if (selectedGenre !== "All Genres") {
      result = result.filter((book) => book.genre === selectedGenre);
    }

    if (selectedAuthor !== "All Authors") {
      result = result.filter((book) => book.author === selectedAuthor);
    }

    if (priceFilter !== "all") {
      result = result.filter((book) => book.price === priceFilter);
    }

    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime());
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "title-asc":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title-desc":
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      default:
        break;
    }

    return result;
  }, [searchQuery, selectedGenre, selectedAuthor, priceFilter, sortBy, allBooks]);

  const activeFiltersCount = [
    selectedGenre !== "All Genres",
    selectedAuthor !== "All Authors",
    priceFilter !== "all",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedGenre("All Genres");
    setSelectedAuthor("All Authors");
    setPriceFilter("all");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="container-editorial py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-foreground">Explore</h1>
            </div>
            <Link to="/" className="text-lg font-semibold tracking-tight text-foreground">
              Wistaar
            </Link>
          </div>
        </div>
      </header>

      <main className="container-editorial py-8 lg:py-12">
        {/* Search and Controls */}
        <div className="space-y-6 mb-10">
          {/* Search Bar */}
          <SearchBar value={searchQuery} onChange={setSearchQuery} />

          {/* Filter Toggle and Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="default"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
              
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-muted-foreground hover:text-foreground gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </Button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 h-10 bg-card border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {sortOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="text-foreground hover:bg-secondary focus:bg-secondary"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="p-6 bg-card rounded-md border border-border animate-fade-up">
              <div className="grid sm:grid-cols-3 gap-6">
                <FilterSelect
                  label="Genre"
                  value={selectedGenre}
                  onValueChange={setSelectedGenre}
                  options={genres}
                  placeholder="Select genre"
                />
                <FilterSelect
                  label="Author"
                  value={selectedAuthor}
                  onValueChange={setSelectedAuthor}
                  options={authors}
                  placeholder="Select author"
                />
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Price
                  </label>
                  <div className="flex gap-2">
                    {(["all", "free", "premium"] as const).map((price) => (
                      <Button
                        key={price}
                        variant={priceFilter === price ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPriceFilter(price)}
                        className="flex-1 capitalize"
                      >
                        {price === "all" ? "All" : price}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-8">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading books...</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"} found
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          )}
        </div>

        {/* Books Grid */}
        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 lg:gap-8">
            {filteredBooks.map((book) =>
              book.isApproved ? (
                <ApprovedBookCard key={book.id} book={book} />
              ) : (
                <ExploreBookCard key={book.id} book={book as any} />
              )
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground mb-4">
              No books found matching your criteria.
            </p>
            <Button variant="outline" onClick={clearAllFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Explore;
