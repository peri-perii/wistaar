import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, IndianRupee, RotateCcw, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [username, setUsername] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  const purchaseAgeHours = (new Date().getTime() - new Date(book.purchasedAt).getTime()) / (1000 * 60 * 60);
  const isRefundable = purchaseAgeHours < 24;

  const openRefundDialog = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isRefundable) return;

    setShowRefundDialog(true);
    setIsLoadingUser(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        
        // Fetch username from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.username) {
          setUsername(profile.username);
        } else {
          setUsername(user.email?.split('@')[0] || "User");
        }
      }
    } catch (err) {
      console.error("Error loading user profile:", err);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const mailtoSubject = encodeURIComponent(`Refund Request: ${book.title}`);
  const mailtoBody = encodeURIComponent(
    `Hello Support Team,\n\n` +
    `I would like to request a refund for my purchase of "${book.title}".\n` +
    `Here are my details:\n\n` +
    `- Username: @${username}\n` +
    `- Account Email: ${userEmail}\n` +
    `- Book Title: ${book.title}\n` +
    `- Book Price: ₹${book.priceAmount}\n\n` +
    `I have attached the required screenshots showing my reading progress.\n\n` +
    `Thank you!`
  );
  const mailtoLink = `mailto:support@wistaar.com?subject=${mailtoSubject}&body=${mailtoBody}`;

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
                          disabled={!isRefundable}
                          onClick={openRefundDialog}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
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

      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" />
              Request Refund
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              To complete your refund request, please send an email to our support team with the following details and attachments.
            </DialogDescription>
          </DialogHeader>

          {isLoadingUser ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 py-2 text-foreground">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm border border-border">
                <p><strong>📧 Support Email:</strong> support@wistaar.com</p>
                <p><strong>👤 Username:</strong> @{username}</p>
                <p><strong>🏷️ Registered Email:</strong> {userEmail}</p>
                <p><strong>📖 Book Title:</strong> {book.title}</p>
                <p><strong>💰 Price:</strong> ₹{book.priceAmount}</p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-lg p-4 text-xs space-y-1.5">
                <p className="font-semibold">⚠️ Important Instructions:</p>
                <p>• You must send the email from your registered account email ({userEmail}).</p>
                <p>• You <strong>MUST attach screenshots</strong> of the book in your reader showing exactly how much you have read.</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-between gap-2 mt-4">
            <Button variant="ghost" onClick={() => setShowRefundDialog(false)} className="text-xs">
              Cancel
            </Button>
            <Button asChild className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1" disabled={isLoadingUser}>
              <a href={mailtoLink}>
                <Mail className="w-3 h-3" />
                Open Email Client
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
