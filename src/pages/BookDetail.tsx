import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { mockBooks } from "@/data/books";
import { useApprovedBooks } from "@/hooks/useApprovedBooks";
import { useBookChapters } from "@/hooks/useBookChapters";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Clock, BookOpen, Star, Calendar, Play, IndianRupee, Loader2, ShoppingCart, Check, Tag, X, Sparkles } from "lucide-react";
import BookReviews from "@/components/BookReviews";
import SocialShare from "@/components/SocialShare";
import WishlistButton from "@/components/WishlistButton";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useHasPurchased, useInitiatePayment } from "@/hooks/usePurchases";
import { useCart, useAddToCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useCoupon } from "@/hooks/useCoupon";
import { calculatePriceBreakdown, calculateSplitPayment, WISTIES_THRESHOLD } from "@/lib/pricing";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: approvedBooks, isLoading: loadingApproved } = useApprovedBooks();
  const { data: chapters, isLoading: loadingChapters } = useBookChapters(id);
  const { progress, isLoading: loadingProgress } = useReadingProgress(id);
  const { data: hasPurchased } = useHasPurchased(id);
  const { data: cartItems } = useCart();
  const addToCart = useAddToCart();
  const initiatePayment = useInitiatePayment();
  const [paying, setPaying] = useState(false);
  const [wistiesBalance, setWistiesBalance] = useState(0);
  const [useWisties, setUseWisties] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    supabase
      .from('wisties_balance')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setWistiesBalance(data.balance); });
  }, [user]);

  const isInCart = cartItems?.some((item) => item.book_id === id);

  // We initialize useCoupon with 0 and update when book is loaded
  // priceAmount is derived after book normalization, so we track it via state
  const [bookPrice, setBookPrice] = useState(0);
  const {
    couponCode, setCouponCode,
    appliedCoupon, validating, couponError,
    discount, finalAmount,
    validateCoupon, removeCoupon, incrementUsage,
  } = useCoupon(bookPrice);

  // Resolve book early so SEO can use it
  const approvedBook = approvedBooks?.find((b) => b.id === id);
  const mockBook = mockBooks.find((b) => b.id === id);
  const resolvedTitle = approvedBook?.title ?? mockBook?.title ?? "Book";
  const resolvedAuthor = approvedBook?.author ?? mockBook?.author ?? "";
  const resolvedDesc = approvedBook?.description ?? mockBook?.fullDescription ?? "";
  const resolvedCover = approvedBook?.coverImageUrl ?? undefined;

  useSEO({
    title: resolvedTitle ? `${resolvedTitle} by ${resolvedAuthor}` : "Book Details",
    description: resolvedDesc
      ? `${resolvedDesc.slice(0, 140).trimEnd()}…`
      : `Read ${resolvedTitle} by ${resolvedAuthor} on Wistaar. Free preview chapters available.`,
    canonicalPath: `/book/${id}`,
    ogImage: resolvedCover,
    ogType: "book",
  });

  // Show toast on payment redirect
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      toast.success("Payment successful! You now have full access to this book.");
    } else if (payment === "failed") {
      toast.error("Payment failed. Please try again.");
    }
  }, [searchParams]);

  const isApproved = !!approvedBook;

  if (loadingApproved) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!approvedBook && !mockBook) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-24 pb-16">
          <div className="container-editorial text-center py-20">
            <h1 className="text-2xl font-serif font-medium text-foreground mb-4">Book not found</h1>
            <p className="text-muted-foreground mb-8">The book you're looking for doesn't exist or has been removed.</p>
            <Link to="/explore"><Button>Browse Books</Button></Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Normalize data
  const book = approvedBook
    ? {
        id: approvedBook.id,
        title: approvedBook.title,
        author: approvedBook.author,
        authorBio: approvedBook.authorBio,
        genre: approvedBook.genre,
        price: approvedBook.price,
        priceAmount: approvedBook.priceAmount,
        rating: approvedBook.rating,
        coverColor: approvedBook.coverColor,
        coverImageUrl: approvedBook.coverImageUrl,
        description: approvedBook.description,
        publishedDate: approvedBook.publishedDate,
        freeChapters: approvedBook.freeChapters,
        totalChapters: approvedBook.totalChapters,
        readCount: approvedBook.readCount,
      }
    : {
        id: mockBook!.id,
        title: mockBook!.title,
        author: mockBook!.author,
        authorBio: mockBook!.authorBio,
        genre: mockBook!.genre,
        price: mockBook!.price,
        priceAmount: 0,
        rating: mockBook!.rating,
        coverColor: mockBook!.coverColor,
        coverImageUrl: null as string | null,
        description: mockBook!.fullDescription,
        publishedDate: mockBook!.publishedDate,
        freeChapters: 3,
        totalChapters: mockBook!.chapters.length,
        readCount: 0,
      };

  // Sync price into coupon hook whenever book is determined
  if (bookPrice !== book.priceAmount) setBookPrice(book.priceAmount);

  const formattedDate = new Date(book.publishedDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const readUrl = isApproved ? `/reader/${book.id}` : `/read/${book.id}?chapter=1`;
  const continueUrl = isApproved
    ? `/reader/${book.id}`
    : `/read/${book.id}?chapter=${progress?.current_chapter || 1}`;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16">
        {/* Back Link */}
        <div className="container-editorial mb-8">
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>
        </div>

        {/* Hero Section */}
        <section className="container-editorial">
          <div className="grid lg:grid-cols-3 gap-12 lg:gap-16">
            {/* Book Cover */}
            <div className="lg:col-span-1">
              <div
                className={`aspect-[3/4] ${book.coverColor} rounded-lg flex items-center justify-center sticky top-24 relative overflow-hidden`}
              >
                {book.coverImageUrl ? (
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-8">
                    <h3 className="font-serif text-xl font-medium text-foreground leading-tight mb-2">
                      {book.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Book Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title & Meta */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Badge
                    variant={book.price === "premium" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {book.price === "premium" ? (
                      <span className="flex items-center gap-0.5">
                        <IndianRupee className="w-3 h-3" />
                        {book.priceAmount}
                      </span>
                    ) : (
                      "Free"
                    )}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{book.genre}</span>
                  {isApproved && <WishlistButton bookId={book.id} variant="button" />}
                </div>

                <h1 className="text-4xl md:text-5xl font-serif font-medium text-foreground leading-tight mb-4">
                  {book.title}
                </h1>

                <p className="text-lg text-muted-foreground">
                  by <span className="text-foreground">{book.author}</span>
                </p>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 py-6 border-y border-border">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">
                    {book.rating > 0 ? book.rating.toFixed(1) : "New"}
                  </span>
                  <span className="text-sm text-muted-foreground">rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{book.totalChapters} chapters</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{formattedDate}</span>
                </div>
                {book.readCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{book.readCount} reads</span>
                  </div>
                )}
              </div>

              {/* Free chapters info for premium */}
              {book.price === "premium" && (
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                  <p className="text-sm text-foreground">
                    <strong>{book.freeChapters} free chapters</strong> available to preview before purchasing.
                  </p>
                </div>
              )}

              {/* CTA */}
              <div className="flex flex-wrap gap-4">
                {/* Free book or already purchased — show read buttons */}
                {(book.price !== "premium" || hasPurchased) ? (
                  <>
                    {progress && progress.current_chapter > 1 ? (
                      <>
                        <Link to={continueUrl}>
                          <Button size="lg" className="gap-2">
                            <Play className="h-5 w-5" />
                            Continue Reading
                          </Button>
                        </Link>
                        <Link to={readUrl}>
                          <Button variant="outline" size="lg" className="gap-2">
                            <BookOpen className="h-5 w-5" />
                            Start Over
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <Link to={readUrl}>
                        <Button size="lg" className="gap-2">
                          <BookOpen className="h-5 w-5" />
                          Start Reading
                        </Button>
                      </Link>
                    )}
                    {hasPurchased && (
                      <Badge variant="secondary" className="self-center text-sm gap-1">
                        <Check className="h-3.5 w-3.5" /> Purchased
                      </Badge>
                    )}
                  </>
                ) : (
                  /* Premium book not purchased — show coupon + Wisties toggle + buy */
                  <div className="w-full space-y-4">
                    {/* Coupon Code Input */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Enter coupon code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            className="pl-9 font-mono uppercase"
                            disabled={!!appliedCoupon}
                            onKeyDown={(e) => { if (e.key === "Enter") validateCoupon(); }}
                          />
                        </div>
                        {appliedCoupon ? (
                          <Button variant="outline" size="sm" onClick={removeCoupon} className="gap-1 self-center">
                            <X className="h-4 w-4" /> Remove
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={validateCoupon} disabled={!couponCode.trim() || validating} className="self-center">
                            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                          </Button>
                        )}
                      </div>
                      {couponError && (
                        <p className="text-sm text-destructive">{couponError}</p>
                      )}
                      {appliedCoupon && (
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Check className="h-4 w-4" />
                          <span>
                            Coupon <strong>{appliedCoupon.code}</strong> applied! You save ₹{discount.toFixed(0)}.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Price summary (coupon applied) */}
                    {appliedCoupon && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Original price</span>
                          <span className="flex items-center"><IndianRupee className="h-3 w-3" />{book.priceAmount}</span>
                        </div>
                        <div className="flex justify-between text-primary">
                          <span>Discount ({appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}%` : `₹${appliedCoupon.discount_value}`})</span>
                          <span className="flex items-center">- <IndianRupee className="h-3 w-3" />{discount.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1">
                          <span>Total</span>
                          <span className="flex items-center"><IndianRupee className="h-3 w-3" />{finalAmount.toFixed(0)}</span>
                        </div>
                      </div>
                    )}

                    {/* Wisties Toggle */}
                    {(() => {
                      const canUseWistiesHere = finalAmount > WISTIES_THRESHOLD;
                      const split = calculateSplitPayment(finalAmount, wistiesBalance);
                      const effectiveUseWisties = useWisties && canUseWistiesHere;

                      return (
                        <>
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                            <div className="space-y-0.5">
                              <Label htmlFor="bd-wisties-toggle" className="text-sm font-medium flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-accent" />
                                Pay with Wisties
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {wistiesBalance > 0
                                  ? `You have ₹${wistiesBalance} Wisties`
                                  : "No Wisties balance"}
                                {!canUseWistiesHere && wistiesBalance > 0
                                  ? " · Only for books above ₹" + WISTIES_THRESHOLD
                                  : ""}
                              </p>
                            </div>
                            <Switch
                              id="bd-wisties-toggle"
                              checked={useWisties}
                              onCheckedChange={setUseWisties}
                              disabled={wistiesBalance <= 0 || !canUseWistiesHere}
                            />
                          </div>

                          {/* Split breakdown */}
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
                                <span>Platform fee</span>
                                <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{split.platformFee.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
                                <span>You pay today (cash)</span>
                                <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{split.cashTotal.toFixed(2)}</span>
                              </div>
                              <p className="text-xs text-accent pt-0.5">✦ ₹{split.wistiesApplied.toFixed(0)} will be deducted from your Wisties balance</p>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-3">
                            <Button
                              size="lg"
                              className="gap-2"
                              disabled={paying}
                              onClick={async () => {
                                if (!user) { navigate("/auth"); return; }
                                setPaying(true);
                                try {
                                  if (effectiveUseWisties) {
                                    const { error } = await supabase.rpc('purchase_book_split_payment' as any, {
                                      p_book_id: book.id,
                                      p_book_title: book.title,
                                      p_wisties_amount: split.wistiesApplied,
                                      p_cash_amount: split.cashBeforeFee,
                                    });
                                    if (error) throw error;
                                    // Invalidate cache so library & buy button refresh immediately
                                    queryClient.invalidateQueries({ queryKey: ['purchases'] });
                                    queryClient.invalidateQueries({ queryKey: ['has-purchased'] });
                                    setWistiesBalance(prev => prev - split.wistiesApplied);
                                    if (appliedCoupon) await incrementUsage(appliedCoupon.id);
                                    toast.success(`Purchased! ₹${split.wistiesApplied} Wisties + ₹${split.cashTotal.toFixed(0)} cash. Book added to your library!`);
                                  } else {
                                    await initiatePayment.mutateAsync({
                                      bookId: book.id,
                                      bookTitle: book.title,
                                      amount: finalAmount,
                                    });
                                    if (appliedCoupon) await incrementUsage(appliedCoupon.id);
                                    toast.success("Payment successful! You now have full access.");
                                  }
                                } catch (err: any) {
                                  toast.error(err.message || "Payment failed. Please try again.");
                                } finally {
                                  setPaying(false);
                                }
                              }}
                            >
                              {paying ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : effectiveUseWisties ? (
                                <>
                                  <Sparkles className="h-5 w-5" />
                                  Pay ₹{split.cashTotal.toFixed(0)} + ₹{split.wistiesApplied} W
                                </>
                              ) : (
                                <>
                                  <IndianRupee className="h-5 w-5" />
                                  {appliedCoupon
                                    ? `Buy for ₹${finalAmount.toFixed(0)}`
                                    : `Buy for ₹${book.priceAmount}`}
                                </>
                              )}
                            </Button>

                            <Button
                              variant="outline"
                              size="lg"
                              className="gap-2"
                              disabled={isInCart}
                              onClick={() => {
                                if (!user) { navigate("/auth"); return; }
                                addToCart.mutate(book.id);
                              }}
                            >
                              <ShoppingCart className="h-5 w-5" />
                              {isInCart ? "In Cart" : "Buy Later"}
                            </Button>

                            <Link to={readUrl}>
                              <Button variant="ghost" size="lg" className="gap-2">
                                <BookOpen className="h-5 w-5" />
                                Preview Free Chapters
                              </Button>
                            </Link>
                          </div>

                          <p className="text-xs text-muted-foreground text-center pt-2">
                            {effectiveUseWisties
                              ? `₹${split.wistiesApplied.toFixed(0)} Wisties + ₹${split.cashTotal.toFixed(2)} cash (incl. ₹${split.platformFee.toFixed(2)} platform fee)`
                              : `₹${finalAmount.toFixed(2)} · Includes ₹${calculatePriceBreakdown(finalAmount).platformFee.toFixed(2)} platform fee`}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-4">
                <h2 className="text-xl font-serif font-medium text-foreground">About this book</h2>
                <p className="text-muted-foreground leading-relaxed">{book.description}</p>
              </div>

              {/* Author Bio */}
              {book.authorBio && (
                <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                  <h2 className="text-xl font-serif font-medium text-foreground">About the Author</h2>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-medium text-foreground">
                        {book.author
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-2">{book.author}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{book.authorBio}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chapters list for approved books */}
              {isApproved && chapters && chapters.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-serif font-medium text-foreground">Chapters</h2>
                  <div className="border border-border rounded-lg divide-y divide-border">
                    {chapters.map((chapter) => (
                      <Link
                        key={chapter.id}
                        to={`/reader/${book.id}`}
                        className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground w-8">
                            {chapter.chapter_number}.
                          </span>
                          <span className="text-foreground">{chapter.title}</span>
                        </div>
                        {book.price === "premium" && chapter.chapter_number > book.freeChapters && (
                          <Badge variant="outline" className="text-xs">Premium</Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapters list for mock books */}
              {!isApproved && mockBook && (
                <div className="space-y-4">
                  <h2 className="text-xl font-serif font-medium text-foreground">Chapters</h2>
                  <div className="border border-border rounded-lg divide-y divide-border">
                    {mockBook.chapters.map((chapter) => (
                      <Link
                        key={chapter.id}
                        to={`/read/${book.id}?chapter=${chapter.number}`}
                        className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground w-8">{chapter.number}.</span>
                          <span className="text-foreground">{chapter.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {chapter.readingTime}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Share */}
              <div className="py-4 border-t border-border">
                <SocialShare title={`Check out "${book.title}" on Wistaar`} />
              </div>

              {/* Reviews */}
              {isApproved && (
                <BookReviews bookId={book.id} />
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
