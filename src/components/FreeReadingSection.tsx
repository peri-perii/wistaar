import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useApprovedBooks } from "@/hooks/useApprovedBooks";

const FreeReadingSection = () => {
  const { data: approvedBooks, isLoading } = useApprovedBooks();
  const freeBooks = (approvedBooks || []).filter((b) => b.price === "free").slice(0, 4);

  if (!isLoading && freeBooks.length === 0) return null;

  return (
    <section className="section-padding border-t border-border">
      <div className="container-main">
        <div className="text-center mb-16">
          <p className="text-sm tracking-widest uppercase text-accent mb-4">
            Open Access
          </p>
          <h2 className="text-3xl md:text-4xl mb-4">Free Reading</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Stories shared freely by authors who believe in open literature.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-12">
          {isLoading
            ? [1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center animate-pulse">
                  <div className="aspect-[2/3] bg-secondary rounded-lg mb-4" />
                  <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-1" />
                  <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
                </div>
              ))
            : freeBooks.map((book) => (
                <Link to={`/book/${book.id}`} key={book.id}>
                  <article className="group cursor-pointer text-center">
                    <div className="aspect-[2/3] bg-secondary rounded-lg mb-4 flex items-end justify-center p-4 transition-transform duration-300 group-hover:-translate-y-1 overflow-hidden relative">
                      {book.coverImageUrl ? (
                        <img
                          src={book.coverImageUrl}
                          alt={book.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">
                          {book.genre}
                        </span>
                      )}
                    </div>
                    <h3 className="font-sans font-medium text-sm mb-1 group-hover:text-accent transition-colors line-clamp-1">
                      {book.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{book.author}</p>
                  </article>
                </Link>
              ))}
        </div>

        <div className="text-center">
          <Link to="/explore?filter=free">
            <Button variant="ghost" className="gap-2 group">
              Browse all free books
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FreeReadingSection;
