// Resolved merge conflict by keeping our changes from Divyansh0109:main branch
import { Navigate, Link } from "react-router-dom";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Trash2, IndianRupee, BookOpen, Loader2, Tag, Check, X, Sparkles, CheckCircle2, AlertCircle, Library } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart, useRemoveFromCart } from "@/hooks/useCart";
import { useApprovedBooks } from "@/hooks/useApprovedBooks";
import { useInitiatePayment } from "@/hooks/usePurchases";
import { useCoupon } from "@/hooks/useCoupon";
import { calculateSplitPayment, WISTIES_THRESHOLD } from "@/lib/pricing";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

/* ------------------------------------------------------------------ */
/*  Info stored after a successful purchase – drives the success screen */
/* ------------------------------------------------------------------ */
interface PurchasedBookInfo {
  title: string;
  author: string;
  coverImageUrl?: string;
  coverColor?: string;
  amountPaid: string;
}

export default function Cart() {
  const { user, loading: authLoading } = useAuth();
  const { data: cartItems, isLoading: cartLoading } = useCart();
  const { data: approvedBooks } = useApprovedBooks();
  const removeFromCart = useRemoveFromCart();
  const initiatePayment = useInitiatePayment();
  const [payingBookId, setPayingBookId] = useState<string | null>(null);
  const [wistiesBalance, setWistiesBalance] = useState<number>(0);
  const [useWisties, setUseWisties] = useState(false);

  /* NEW: state that triggers the post-purchase success screen */
  const [purchasedBook, setPurchasedBook] = useState<PurchasedBookInfo | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchBalance = async () => {
      const { data } = await supabase.from('wisties_balance').select('balance').eq('user_id', user.id).maybeSingle();
      if (data) setWistiesBalance(data.balance);
    };
    fetchBalance();
  }, [user]);

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const cartBooks = (cartItems || [])
    .map((item) => {
      const book = approvedBooks?.find((b) => b.id === item.book_id);
      return book ? { ...book, cartId: item.id } : null;
    })
    .filter(Boolean) as (NonNullable<ReturnType<typeof approvedBooks extends (infer T)[] | undefined ? () => T : never>> & { cartId: string })[];

  // Toggle is only useful if at least one cart book qualifies
  const hasEligibleBook = cartBooks.some((b: any) => b.priceAmount > WISTIES_THRESHOLD);

  const isLoading = cartLoading || authLoading;

  /* ================================================================ */
  /*  NEW — Feature 3: Success Screen after purchase                  */
  /* ================================================================ */
  if (purchasedBook) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-24 pb-16">
          <div className="container-editorial max-w-lg text-center">
            {/* Animated check icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>

            <h1 className="text-3xl md:text-4xl font-display font-medium text-foreground mb-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
              Purchase Successful!
            </h1>
            <p className="text-muted-foreground mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              Your book has been added to your library.
            </p>

            {/* Purchased book card */}
            <div className="p-6 bg-card border border-border rounded-lg mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 justify-center">
                <div className={`w-16 h-24 ${purchasedBook.coverColor || 'bg-muted'} rounded overflow-hidden relative flex-shrink-0`}>
                  {purchasedBook.coverImageUrl && (
                    <img
                      src={purchasedBook.coverImageUrl}
                      alt={purchasedBook.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-foreground">{purchasedBook.title}</h3>
                  <p className="text-sm text-muted-foreground">{purchasedBook.author}</p>
                  <p className="text-sm text-primary mt-1 font-medium">Paid {purchasedBook.amountPaid}</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Link to="/library">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  <Library className="h-5 w-5" />
                  Go to Library
                </Button>
              </Link>
              <Link to="/explore">
                <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                  <BookOpen className="h-5 w-5" />
                  Continue Browsing
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ================================================================ */
  /*  Normal cart view (unchanged layout, new features wired in)      */
  /* ================================================================ */
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16">
        <div className="container-editorial max-w-3xl">
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-display font-medium text-foreground mb-3">
              My Cart
            </h1>
            <p className="text-muted-foreground">
              Books you've saved to buy later.
            </p>
          </div>

          {isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && cartBooks.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <ShoppingCart className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-display font-medium text-foreground mb-3">
                Your cart is empty
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Browse premium books and add them to your cart to buy later.
              </p>
              <Link to="/explore">
                <Button size="lg" className="gap-2">
                  <BookOpen className="h-5 w-5" />
                  Explore Books
                </Button>
              </Link>
            </div>
          )}

          {!isLoading && cartBooks.length > 0 && (
            <div className="space-y-4">
              {/* Wisties toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                <div className="space-y-0.5">
                  <Label htmlFor="wisties-toggle" className="text-base font-medium flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-accent" />
                    Use Wisties balance
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {wistiesBalance > 0
                      ? `₹${wistiesBalance} available`
                      : "No Wisties balance"}
                    {!hasEligibleBook && wistiesBalance > 0
                      ? " · Only applicable for books above ₹99"
                      : ""}
                  </p>
                </div>
                <Switch
                  id="wisties-toggle"
                  checked={useWisties}
                  onCheckedChange={setUseWisties}
                  disabled={wistiesBalance <= 0 || !hasEligibleBook}
                />
              </div>

              {cartBooks.map((book: any) => (
                <CartBookItem
                  key={book.id}
                  book={book}
                  payingBookId={payingBookId}
                  setPayingBookId={setPayingBookId}
                  initiatePayment={initiatePayment}
                  removeFromCart={removeFromCart}
                  useWisties={useWisties}
                  wistiesBalance={wistiesBalance}
                  onWistiesUpdate={(newBalance) => setWistiesBalance(newBalance)}
                  onPurchaseSuccess={setPurchasedBook}
                />
              ))}

              <p className="text-xs text-center text-muted-foreground pt-4">
                <Link to="/refund-policy" className="hover:underline">Wisties Refund Policy</Link>: We offer full store credit refunds within 24 hours. No cash refunds.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ================================================================== */
/*  CartBookItem — per-book card with NEW features wired in           */
/* ================================================================== */
function CartBookItem({
  book,
  payingBookId,
  setPayingBookId,
  initiatePayment,
  removeFromCart,
  useWisties,
  wistiesBalance,
  onWistiesUpdate,
  onPurchaseSuccess,
}: {
  book: any;
  payingBookId: string | null;
  setPayingBookId: (id: string | null) => void;
  initiatePayment: ReturnType<typeof useInitiatePayment>;
  removeFromCart: ReturnType<typeof useRemoveFromCart>;
  useWisties: boolean;
  wistiesBalance: number;
  onWistiesUpdate: (val: number) => void;
  /* NEW prop: callback to show the success screen */
  onPurchaseSuccess: (info: PurchasedBookInfo) => void;
}) {
  const {
    couponCode, setCouponCode,
    appliedCoupon, validating, couponError,
    discount, finalAmount,
    validateCoupon, removeCoupon, incrementUsage,
  } = useCoupon(book.priceAmount);

  // Whether this specific book is eligible for Wisties
  const canUseWistiesForBook = finalAmount > WISTIES_THRESHOLD;
  const effectiveUseWisties = useWisties && canUseWistiesForBook;

  // Split payment breakdown
  const split = calculateSplitPayment(finalAmount, wistiesBalance);

  const queryClient = useQueryClient();

  /* NEW: state for confirmation dialog and inline error */
  const [showConfirm, setShowConfirm] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const isPaying = payingBookId === book.id;

  /* Pre-compute display values for the order summary */
  const platformFee = effectiveUseWisties
    ? split.platformFee
    : 6;
  const totalPayable = effectiveUseWisties
    ? split.cashTotal
    : Number((finalAmount + 6).toFixed(2));

  /* NEW: clicking Buy opens the confirmation dialog */
  const handleBuyClick = () => {
    setPaymentError(null);
    setShowConfirm(true);
  };

  /* NEW: actually executes payment — called from the confirm dialog */
  const handleConfirmPay = async () => {
    setShowConfirm(false);
    setPayingBookId(book.id);
    setPaymentError(null);

    try {
      let amountLabel: string;

      if (effectiveUseWisties) {
        const { error } = await supabase.rpc('purchase_book_split_payment' as any, {
          p_book_id: book.id,
          p_book_title: book.title,
          p_wisties_amount: split.wistiesApplied,
          p_cash_amount: split.cashBeforeFee,
        });

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['purchases'] });
        queryClient.invalidateQueries({ queryKey: ['has-purchased'] });

        onWistiesUpdate(wistiesBalance - split.wistiesApplied);
        amountLabel = `₹${split.wistiesApplied.toFixed(0)} Wisties + ₹${split.cashTotal.toFixed(0)} cash`;
      } else {
        await initiatePayment.mutateAsync({ bookId: book.id, bookTitle: book.title, amount: finalAmount });
        amountLabel = `₹${finalAmount.toFixed(0)}`;
      }

      if (appliedCoupon) await incrementUsage(appliedCoupon.id);
      removeFromCart.mutate(book.id);

      /* Trigger the success screen in the parent */
      onPurchaseSuccess({
        title: book.title,
        author: book.author,
        coverImageUrl: book.coverImageUrl,
        coverColor: book.coverColor,
        amountPaid: amountLabel,
      });
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Payment failed. Please try again.";
      setPaymentError(msg);
      toast.error(msg);
    } finally {
      setPayingBookId(null);
    }
  };

  return (
    <div className="p-4 bg-card border border-border rounded-lg space-y-3">
      {/* Book info row — unchanged */}
      <div className="flex items-center gap-4">
        <Link to={`/book/${book.id}`} className="flex-shrink-0">
          <div className={`w-16 h-24 ${book.coverColor} rounded overflow-hidden relative`}>
            {book.coverImageUrl && (
              <img
                src={book.coverImageUrl}
                alt={book.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <Link to={`/book/${book.id}`}>
            <h3 className="font-medium text-foreground line-clamp-1 hover:text-primary transition-colors">
              {book.title}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground">{book.author}</p>
          <div className="flex items-center gap-2 mt-1">
            {appliedCoupon ? (
              <>
                <Badge variant="outline" className="text-xs line-through text-muted-foreground">
                  <IndianRupee className="w-3 h-3" />{book.priceAmount}
                </Badge>
                <Badge className="text-xs">
                  <IndianRupee className="w-3 h-3" />{finalAmount.toFixed(0)}
                </Badge>
              </>
            ) : (
              <Badge className="text-xs">
                <IndianRupee className="w-3 h-3" />{book.priceAmount}
              </Badge>
            )}
            {!canUseWistiesForBook && useWisties && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Wisties not applicable (≤₹{WISTIES_THRESHOLD})
              </Badge>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeFromCart.mutate(book.id)}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* ============================================================ */}
      {/*  NEW — Feature 1: Itemized Order Summary (always visible)    */}
      {/* ============================================================ */}
      <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1.5 border border-border">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Order Summary
        </p>

        {/* Subtotal */}
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="flex items-center gap-0.5">
            <IndianRupee className="h-3 w-3" />{book.priceAmount}
          </span>
        </div>

        {/* Coupon discount — only when a coupon is applied */}
        {appliedCoupon && (
          <div className="flex justify-between text-primary">
            <span>Coupon ({appliedCoupon.code})</span>
            <span>−₹{discount.toFixed(0)}</span>
          </div>
        )}

        {/* Wisties — only when active for this book */}
        {effectiveUseWisties && (
          <div className="flex justify-between text-accent">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />Wisties applied
            </span>
            <span>−₹{split.wistiesApplied.toFixed(0)}</span>
          </div>
        )}

        {/* Platform fee */}
        <div className="flex justify-between text-muted-foreground">
          <span>Platform fee (₹6)</span>
          <span className="flex items-center gap-0.5">
            <IndianRupee className="h-3 w-3" />{platformFee.toFixed(2)}
          </span>
        </div>

        {/* Total payable */}
        <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
          <span>Total Payable</span>
          <span className="flex items-center gap-0.5">
            <IndianRupee className="h-3 w-3" />{totalPayable.toFixed(2)}
          </span>
        </div>

        {effectiveUseWisties && (
          <p className="text-xs text-accent pt-1">
            ✦ ₹{split.wistiesApplied.toFixed(0)} covered from your Wisties balance
          </p>
        )}
      </div>

      {/* Coupon input + Buy button row — unchanged layout */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="pl-8 h-9 text-sm font-mono uppercase"
              disabled={!!appliedCoupon}
              onKeyDown={(e) => { if (e.key === "Enter") validateCoupon(); }}
            />
          </div>
          {appliedCoupon ? (
            <Button variant="outline" size="sm" onClick={removeCoupon} className="gap-1 h-9 text-xs">
              <X className="h-3 w-3" /> Remove
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={validateCoupon} disabled={!couponCode.trim() || validating} className="h-9 text-xs">
              {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
            </Button>
          )}

          {/* Buy button — NEW: shows "Processing…" while paying, opens confirm dialog */}
          <Button
            size="sm"
            className="h-9 text-xs gap-1"
            onClick={handleBuyClick}
            disabled={isPaying}
          >
            {isPaying ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing…</>
            ) : effectiveUseWisties ? (
              <>
                <Sparkles className="h-3 w-3" />
                Pay ₹{split.cashTotal.toFixed(2)}
              </>
            ) : (
              <>Buy ₹{totalPayable.toFixed(2)}</>
            )}
          </Button>
        </div>
        {couponError && <p className="text-xs text-destructive">{couponError}</p>}
        {appliedCoupon && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Check className="h-3.5 w-3.5" />
            <span><strong>{appliedCoupon.code}</strong> — You save ₹{discount.toFixed(0)}</span>
          </div>
        )}

        {/* NEW — Feature 4: Inline error after failed payment */}
        {paymentError && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive mt-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{paymentError}</span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  NEW — Feature 2: Payment Confirmation Dialog                */}
      {/* ============================================================ */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to purchase <strong className="text-foreground">{book.title}</strong>.
                </p>
                {/* Mini order summary inside the dialog */}
                <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1 border border-border">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Book price</span>
                    <span className="flex items-center gap-0.5">
                      <IndianRupee className="h-3 w-3" />{finalAmount.toFixed(0)}
                    </span>
                  </div>
                  {effectiveUseWisties && (
                    <div className="flex justify-between text-accent">
                      <span>Wisties</span>
                      <span>−₹{split.wistiesApplied.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Platform fee</span>
                    <span className="flex items-center gap-0.5">
                      <IndianRupee className="h-3 w-3" />{platformFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
                    <span>You pay</span>
                    <span className="flex items-center gap-0.5">
                      <IndianRupee className="h-3 w-3" />{totalPayable.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleConfirmPay} className="gap-1.5">
              <Check className="h-4 w-4" />
              Confirm &amp; Pay
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
