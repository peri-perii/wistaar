import { Navigate, Link } from "react-router-dom";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Trash2, IndianRupee, BookOpen, Loader2, Tag, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart, useRemoveFromCart } from "@/hooks/useCart";
import { useApprovedBooks } from "@/hooks/useApprovedBooks";
import { useInitiatePayment } from "@/hooks/usePurchases";
import { useCoupon } from "@/hooks/useCoupon";
import { useState } from "react";

export default function Cart() {
  const { user, loading: authLoading } = useAuth();
  const { data: cartItems, isLoading: cartLoading } = useCart();
  const { data: approvedBooks } = useApprovedBooks();
  const removeFromCart = useRemoveFromCart();
  const initiatePayment = useInitiatePayment();
  const [payingBookId, setPayingBookId] = useState<string | null>(null);

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
              {cartBooks.map((book: any) => (
                <CartBookItem
                  key={book.id}
                  book={book}
                  payingBookId={payingBookId}
                  setPayingBookId={setPayingBookId}
                  initiatePayment={initiatePayment}
                  removeFromCart={removeFromCart}
                />
              ))}

              <div className="flex items-center justify-between pt-6 border-t border-border">
                <span className="text-lg font-medium text-foreground">Original Total</span>
                <span className="text-lg font-medium text-foreground flex items-center">
                  <IndianRupee className="w-4 h-4" />
                  {total}
                </span>
              </div>
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
}: {
  book: any;
  payingBookId: string | null;
  setPayingBookId: (id: string | null) => void;
  initiatePayment: ReturnType<typeof useInitiatePayment>;
  removeFromCart: ReturnType<typeof useRemoveFromCart>;
}) {
  const {
    couponCode, setCouponCode,
    appliedCoupon, validating, couponError,
    discount, finalAmount,
    validateCoupon, removeCoupon, incrementUsage,
  } = useCoupon(book.priceAmount);

  const handleBuy = async () => {
    setPayingBookId(book.id);
    try {
      await initiatePayment.mutateAsync({ bookId: book.id, bookTitle: book.title, amount: finalAmount });
      if (appliedCoupon) await incrementUsage(appliedCoupon.id);
      removeFromCart.mutate(book.id);
      toast.success("Payment successful! Book added to your library.");
    } catch {
      toast.error("Payment failed. Please try again.");
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
            ) : (
              <>Buy {appliedCoupon ? `₹${finalAmount.toFixed(0)}` : `₹${book.priceAmount}`}</>
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
      </div>
    </div>
  );
}
