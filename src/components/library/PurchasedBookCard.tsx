import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, IndianRupee, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
  const [isRefunding, setIsRefunding] = useState(false);
  const queryClient = useQueryClient();

  const purchaseAgeHours = (new Date().getTime() - new Date(book.purchasedAt).getTime()) / (1000 * 60 * 60);
  const isRefundable = purchaseAgeHours < 24;

  const handleRefund = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to book detail
    e.stopPropagation();

    if (!isRefundable) return;

    if (!confirm("Are you sure you want to refund this book? You will lose access to it and receive Wisties credit instead.")) {
      return;
    }

    setIsRefunding(true);
    try {
      const { data, error } = await supabase.functions.invoke('refund-to-wisties', {
        body: { bookId: book.id }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success("Refund successful! Wisties have been added to your balance.");
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    } catch (err: any) {
      toast.error(err.message || "Failed to process refund.");
    } finally {
      setIsRefunding(false);
    }
  };

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
              <div className="mt-3" onClick={(e) => e.preventDefault()}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 w-auto"
                          disabled={!isRefundable || isRefunding}
                          onClick={handleRefund}
                        >
                          {isRefunding ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                          Request Refund
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!isRefundable && (
                      <TooltipContent>
                        Refund window (24 hours) has expired
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
