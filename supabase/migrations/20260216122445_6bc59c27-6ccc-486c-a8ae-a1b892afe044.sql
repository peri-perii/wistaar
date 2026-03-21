
-- Table for completed purchases
CREATE TABLE public.book_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.book_submissions(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  transaction_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payu_txnid TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE public.book_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases"
  ON public.book_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert purchases"
  ON public.book_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update purchases"
  ON public.book_purchases FOR UPDATE
  USING (auth.uid() = user_id);

-- Cart / Buy Later table
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.book_submissions(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cart"
  ON public.cart_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own cart"
  ON public.cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own cart"
  ON public.cart_items FOR DELETE
  USING (auth.uid() = user_id);

-- Function to check if user has purchased a book
CREATE OR REPLACE FUNCTION public.has_purchased_book(p_user_id UUID, p_book_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.book_purchases
    WHERE user_id = p_user_id AND book_id = p_book_id AND payment_status = 'completed'
  )
$$;
