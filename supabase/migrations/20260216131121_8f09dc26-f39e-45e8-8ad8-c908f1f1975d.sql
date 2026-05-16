
-- Create book_reviews table
CREATE TABLE public.book_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.book_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);

ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.book_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create their own reviews" ON public.book_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.book_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON public.book_reviews FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_book_reviews_updated_at
  BEFORE UPDATE ON public.book_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create wishlists table
CREATE TABLE public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.book_submissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wishlist" ON public.wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to their own wishlist" ON public.wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from their own wishlist" ON public.wishlists FOR DELETE USING (auth.uid() = user_id);
