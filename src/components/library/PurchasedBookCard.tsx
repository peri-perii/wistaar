import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Check, IndianRupee } from "lucide-react";

interface PurchasedBook {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  coverImageUrl: string | null;
  priceAmount: number;
  purchasedAt: string;
}

interface Props {
  book: PurchasedBook;
  index?: number;
}

export default function PurchasedBookCard({ book, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 22 }}
    >
      <Link to={`/book/${book.id}`}>
        <article className="group bg-card rounded-lg border border-border overflow-hidden hover:border-primary/50 hover:shadow-md transition-all duration-300">
          <div className="flex gap-4 p-4 sm:gap-5 sm:p-5">
            <div className={`flex-shrink-0 w-14 h-20 sm:w-16 sm:h-24 ${book.coverColor} rounded overflow-hidden relative`}>
              {book.coverImageUrl && (
                <img src={book.coverImageUrl} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base sm:text-lg font-medium text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors duration-200">
                {book.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">{book.author}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="secondary" className="text-xs gap-1">
                  <Check className="h-3 w-3" /> Owned
                </Badge>
                <Badge variant="outline" className="text-xs gap-0.5">
                  <IndianRupee className="h-3 w-3" />{book.priceAmount}
                </Badge>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
