import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useApprovedBooks } from "@/hooks/useApprovedBooks";

const PremiumSection = () => {
  const { data: approvedBooks, isLoading } = useApprovedBooks();
  const premiumBooks = (approvedBooks || []).filter((b) => b.price === "premium").slice(0, 3);

  if (!isLoading && premiumBooks.length === 0) return null;

  return (
    <section className="section-padding bg-secondary/30">
      <div className="container-main">
        <div className="text-center mb-16">
          <p className="text-sm tracking-widest uppercase text-accent mb-4">
            Curated Collection
          </p>
          <h2 className="text-3xl md:text-4xl mb-4">Premium eBooks</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Carefully curated works from acclaimed authors.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {isLoading
            ? [1, 2, 3].map((i) => (
                <div key={i} className="bg-background rounded-xl p-6 border border-border animate-pulse">
                  <div className="aspect-video bg-muted rounded-lg mb-6" />
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))
            : premiumBooks.map((book) => (
                <Link to={`/book/${book.id}`} key={book.id}>
                  <article className="group cursor-pointer bg-background rounded-xl p-6 border border-border hover:border-accent/30 transition-colors">
                    <div className="aspect-video rounded-lg mb-6 flex items-center justify-center overflow-hidden relative bg-muted">
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
                    <h3 className="font-sans font-medium mb-2 group-hover:text-accent transition-colors line-clamp-1">
                      {book.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                  </article>
                </Link>
              ))}
        </div>

        <div className="text-center">
          <Link to="/explore?filter=premium">
            <Button variant="ghost" className="gap-2 group">
              Explore premium books
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PremiumSection;
