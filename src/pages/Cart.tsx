import { Navigate, Link } from "react-router-dom";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Trash2, IndianRupee, BookOpen, Loader2, Tag, Check, X, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart, useRemoveFromCart } from "@/hooks/useCart";
import { useApprovedBooks } from "@/hooks/useApprovedBooks";
import { useInitiatePayment } from "@/hooks/usePurchases";
import { useCoupon } from "@/hooks/useCoupon";
import { calculateSplitPayment, WISTIES_THRESHOLD } from "@/lib/pricing";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Cart() {
  const { user, loading: authLoading } = useAuth();
  const { data: cartItems, isLoading: cartLoading } = useCart();
  const { data: approvedBooks } = useApprovedBooks();
  const removeFromCart = useRemoveFromCart();
  const initiatePayment = useInitiatePayment();
  const [payingBookId, setPayingBookId] = useState<string | null>(null);
  const [wistiesBalance, setWistiesBalance] = useState<number>(0);
  const [useWisties, setUseWisties] = useState(false);

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

  const total = cartBooks.reduce((sum, b) => sum + (b as any).priceAmount, 0);

  // Toggle is only useful if at least one cart book qualifies
  const hasEligibleBook = cartBooks.some((b: any) => b.priceAmount > WISTIES_THRESHOLD);

  const isLoading = cartLoading || authLoading;

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
                />
              ))}

              <div className="flex items-center justify-between pt-6 border-t border-border">
                <span className="text-lg font-medium text-foreground">Original Total</span>
                <span className="text-lg font-medium text-foreground flex items-center">
                  <IndianRupee className="w-4 h-4" />
                  {total}
                </span>
              </div>
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

function CartBookItem({
  book,
  payingBookId,
  setPayingBookId,
  initiatePayment,
  removeFromCart,
  useWisties,
  wistiesBalance,
  onWistiesUpdate,
}: {
  book: any;
  payingBookId: string | null;
  setPayingBookId: (id: string | null) => void;
  initiatePayment: ReturnType<typeof useInitiatePayment>;
  removeFromCart: ReturnType<typeof useRemoveFromCart>;
  useWisties: boolean;
  wistiesBalance: number;
  onWistiesUpdate: (val: number) => void;
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

  const handleBuy = async () => {
    setPayingBookId(book.id);
    try {
      if (effectiveUseWisties) {
        // Split payment: Wisties portion + cash portion (mocked)
        const { error } = await supabase.rpc('purchase_book_split_payment' as any, {
          p_book_id: book.id,
          p_book_title: book.title,
          p_wisties_amount: split.wistiesApplied,
          p_cash_amount: split.cashBeforeFee,
        });

        if (error) throw error;

        onWistiesUpdate(wistiesBalance - split.wistiesApplied);
        if (appliedCoupon) await incrementUsage(appliedCoupon.id);
        removeFromCart.mutate(book.id);
        toast.success(`Purchased! ₹${split.wistiesApplied} Wisties + ₹${split.cashTotal.toFixed(0)} cash. Enjoy reading!`);
      } else {
        // Pure cash payment
        await initiatePayment.mutateAsync({ bookId: book.id, bookTitle: book.title, amount: finalAmount });
        if (appliedCoupon) await incrementUsage(appliedCoupon.id);
        removeFromCart.mutate(book.id);
        toast.success("Payment successful! Book added to your library.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Payment failed. Please try again.");
    } finally {
      setPayingBookId(null);
    }
  };

  return (
    <div className="p-4 bg-card border border-border rounded-lg space-y-3">
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

      {/* Wisties split breakdown */}
      {effectiveUseWisties && (
        <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1.5 border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Payment breakdown</p>
          <div className="flex justify-between text-muted-foreground">
            <span>Book price</span>
            <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{finalAmount.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-accent">
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />Wisties applied</span>
            <span>−₹{split.wistiesApplied.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Cash subtotal</span>
            <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{split.cashBeforeFee.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Platform fee (10%)</span>
            <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{split.platformFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
            <span>You pay today</span>
            <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{split.cashTotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-accent pt-1">✦ Remaining ₹{split.wistiesApplied.toFixed(0)} from your Wisties balance</p>
        </div>
      )}

      {/* Coupon input */}
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
          <Button
            size="sm"
            className="h-9 text-xs gap-1"
            onClick={handleBuy}
            disabled={payingBookId === book.id}
          >
            {payingBookId === book.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : effectiveUseWisties ? (
              <>
                <Sparkles className="h-3 w-3" />
                Pay ₹{split.cashTotal.toFixed(0)}
              </>
            ) : (
              <>Buy ₹{appliedCoupon ? finalAmount.toFixed(0) : book.priceAmount}</>
            )}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          {effectiveUseWisties
            ? `₹${split.wistiesApplied.toFixed(0)} Wisties + ₹${split.cashTotal.toFixed(2)} cash (incl. ₹${split.platformFee.toFixed(2)} platform fee)`
            : `₹${finalAmount.toFixed(2)} · Incl. ₹${(finalAmount * 0.1).toFixed(2)} platform fee`}
        </p>
        {couponError && <p className="text-xs text-destructive">{couponError}</p>}
        {appliedCoupon && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Check className="h-3.5 w-3.5" />
            <span><strong>{appliedCoupon.code}</strong> — You save ₹{discount.toFixed(0)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
