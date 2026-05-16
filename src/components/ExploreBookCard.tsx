import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import type { Book } from "@/data/books";

interface ExploreBookCardProps {
  book: Book;
}

const ExploreBookCard = ({ book }: ExploreBookCardProps) => {
  return (
    <Link to={`/book/${book.id}`}>
      <article className="group hover-lift cursor-pointer">
        {/* Book Cover */}
        <div className={`${book.coverColor} aspect-[2/3] rounded-sm mb-4 flex flex-col justify-between p-4 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-300" />
          
          {/* Price Badge */}
          <div className="relative z-10 self-end">
            <span className={`text-xs font-medium uppercase tracking-wider px-2 py-1 rounded ${
              book.price === "premium" 
                ? "bg-primary text-primary-foreground" 
                : "bg-background/80 text-foreground"
            }`}>
              {book.price}
            </span>
          </div>
          
          {/* Genre */}
          <span className="text-xs text-muted-foreground uppercase tracking-wider relative z-10">
            {book.genre}
          </span>
        </div>
        
        {/* Book Info */}
        <div className="space-y-1">
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-1">
            {book.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {book.author}
          </p>
          <div className="flex items-center gap-1 pt-1">
            <Star className="w-3.5 h-3.5 fill-foreground text-foreground" />
            <span className="text-sm text-muted-foreground">{book.rating}</span>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default ExploreBookCard;
