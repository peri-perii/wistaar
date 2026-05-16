import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Archive } from "lucide-react";
import ReadingProgress3D from "@/components/ReadingProgress3D";
import { ReadingProgress } from "@/hooks/useReadingProgress";

export interface LibraryBookWithProgress {
  id: string;
  title: string;
  author: string;
  totalChapters: number;
  coverColor?: string;
  coverImageUrl?: string | null;
  progress: ReadingProgress;
  progressPercent: number;
}

interface Props {
  book: LibraryBookWithProgress;
  index?: number;
  onArchive?: (bookId: string) => void;
}

function formatLastRead(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function ContinueReadingCard({ book, index = 0, onArchive }: Props) {
  const isCompleted = book.progressPercent >= 100;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 22 }}
      layout
      className="group bg-card rounded-lg border border-border overflow-hidden hover:border-primary/50 hover:shadow-md transition-all duration-300"
    >
      <div className="flex gap-4 p-4 sm:gap-5 sm:p-5">
        <div className="flex-shrink-0 flex items-center">
          <ReadingProgress3D percent={book.progressPercent} size={70} strokeWidth={5} />
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`/book/${book.id}`}>
            <h3 className="font-display text-base sm:text-lg font-medium text-foreground leading-tight line-clamp-1 hover:text-accent transition-colors duration-200">
              {book.title}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground mt-0.5">{book.author}</p>
          <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
            <Badge variant={isCompleted ? "default" : "secondary"} className="text-xs">
              {isCompleted ? "Completed" : `Ch ${book.progress.current_chapter}/${book.totalChapters}`}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatLastRead(book.progress.last_read_at)}
            </span>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {!isCompleted && (
              <Link to={`/read/${book.id}?chapter=${book.progress.current_chapter}`}>
                <Button size="sm" className="gap-1.5 text-xs sm:text-sm">
                  <Play className="h-3.5 w-3.5" /> Continue
                </Button>
              </Link>
            )}
            <Link to={`/book/${book.id}`}>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">Details</Button>
            </Link>
            {isCompleted && onArchive && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground text-xs sm:text-sm"
                onClick={(e) => {
                  e.preventDefault();
                  onArchive(book.id);
                }}
              >
                <Archive className="h-3.5 w-3.5" /> Hide
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
