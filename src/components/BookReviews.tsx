import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useBookReviews, useSubmitReview, useDeleteReview, useBookAverageRating } from "@/hooks/useReviews";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface BookReviewsProps {
  bookId: string;
}

const StarRating = ({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={`${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => onRate?.(star)}
        >
          <Star
            className={`w-5 h-5 ${
              star <= (hover || rating)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
};

export default function BookReviews({ bookId }: BookReviewsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: reviews, isLoading } = useBookReviews(bookId);
  const { average, count } = useBookAverageRating(bookId);
  const submitReview = useSubmitReview();
  const deleteReview = useDeleteReview();

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const existingReview = reviews?.find((r) => r.user_id === user?.id);

  const handleSubmit = async () => {
    if (!user) { navigate("/auth"); return; }
    if (rating === 0) { toast.error("Please select a rating"); return; }

    try {
      await submitReview.mutateAsync({ bookId, rating, reviewText: reviewText.trim() || undefined });
      toast.success(existingReview ? "Review updated!" : "Review submitted!");
      setRating(0);
      setReviewText("");
    } catch {
      toast.error("Failed to submit review");
    }
  };

  const handleDelete = async (reviewId: string) => {
    try {
      await deleteReview.mutateAsync({ reviewId, bookId });
      toast.success("Review deleted");
    } catch {
      toast.error("Failed to delete review");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-medium text-foreground">
          Reviews {count > 0 && <span className="text-muted-foreground font-normal text-base">({count})</span>}
        </h2>
        {count > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(average)} />
            <span className="text-sm font-medium text-foreground">{average.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Submit Review Form */}
      <div className="bg-muted/30 rounded-lg p-5 space-y-4 border border-border/50">
        <h3 className="text-sm font-medium text-foreground">
          {existingReview ? "Update your review" : "Write a review"}
        </h3>
        <StarRating rating={rating} onRate={setRating} interactive />
        <Textarea
          placeholder="Share your thoughts about this book... (optional)"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          className="resize-none"
          rows={3}
          maxLength={1000}
        />
        <Button
          onClick={handleSubmit}
          disabled={rating === 0 || submitReview.isPending}
          size="sm"
        >
          {submitReview.isPending ? "Submitting..." : existingReview ? "Update Review" : "Submit Review"}
        </Button>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-5 divide-y divide-border/50">
          {reviews.map((review) => (
            <div key={review.id} className="pt-5 first:pt-0">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {review.display_name}
                    </span>
                    <StarRating rating={review.rating} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </p>
                </div>
                {review.user_id === user?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(review.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {review.review_text && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {review.review_text}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">
          No reviews yet. Be the first to share your thoughts!
        </p>
      )}
    </div>
  );
}
