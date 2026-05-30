-- ============================================================
-- MIGRATION: Fix book_sales to reference book_submissions
-- ============================================================
-- Root cause: book_sales.book_id referenced the empty public.books
-- table, but the app actually stores books in public.book_submissions.
-- This caused:
--   1. The BEFORE INSERT trigger couldn't find the author (query returned NULL)
--   2. author_earnings and wistaar_earnings were never calculated
--   3. NOT NULL constraint on author_earnings failed on every purchase
--
-- This migration fixes the foreign key, trigger, and RLS policy
-- to use public.book_submissions instead of public.books.

-- 1. Drop the foreign key pointing to the empty books table
ALTER TABLE public.book_sales
  DROP CONSTRAINT IF EXISTS book_sales_book_id_fkey;

-- 2. Add correct foreign key pointing to book_submissions
ALTER TABLE public.book_sales
  ADD CONSTRAINT book_sales_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES public.book_submissions(id) ON DELETE CASCADE;

-- 3. Fix the BEFORE INSERT trigger function: look up author from book_submissions
CREATE OR REPLACE FUNCTION public.handle_book_purchase_earnings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id UUID;
  v_author_amt NUMERIC(10,2);
  v_wistaar_amt NUMERIC(10,2);
BEGIN
  -- Fixed: query book_submissions (the real books table) instead of books
  SELECT author_id INTO v_author_id FROM public.book_submissions WHERE id = NEW.book_id;

  IF v_author_id IS NOT NULL THEN
    -- Calculate split: 65% to author, 35% to Wistaar
    v_author_amt := ROUND(NEW.amount_paid * 0.65, 2);
    v_wistaar_amt := NEW.amount_paid - v_author_amt;

    -- Set earnings on the row before it is inserted
    NEW.author_earnings := v_author_amt;
    NEW.wistaar_earnings := v_wistaar_amt;

    -- Credit the author's running totals
    INSERT INTO public.author_details (profile_id, total_sales, total_revenue, payout_due)
    VALUES (v_author_id, 1, v_author_amt, v_author_amt)
    ON CONFLICT (profile_id) DO UPDATE SET
      total_sales = author_details.total_sales + 1,
      total_revenue = author_details.total_revenue + v_author_amt,
      payout_due = author_details.payout_due + v_author_amt;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Fix the RLS policy so authors can see their own sales
DROP POLICY IF EXISTS "Authors can view sales of own books" ON public.book_sales;
CREATE POLICY "Authors can view sales of own books"
  ON public.book_sales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.book_submissions
      WHERE book_submissions.id = book_sales.book_id
        AND book_submissions.author_id = auth.uid()
    )
  );

-- 5. Fix handle_book_purchase_sales to include earnings inline
--    (belt-and-suspenders: the BEFORE INSERT trigger above also sets them)
CREATE OR REPLACE FUNCTION public.handle_book_purchase_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_earnings NUMERIC(10,2);
  v_wistaar_earnings NUMERIC(10,2);
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD IS NULL OR OLD.payment_status IS DISTINCT FROM 'completed') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.book_sales
      WHERE book_id = NEW.book_id AND buyer_id = NEW.user_id
    ) THEN
      -- Calculate 65/35 revenue split
      v_author_earnings := ROUND(NEW.amount * 0.65, 2);
      v_wistaar_earnings := NEW.amount - v_author_earnings;

      INSERT INTO public.book_sales (book_id, buyer_id, amount_paid, author_earnings, wistaar_earnings, sold_at)
      VALUES (NEW.book_id, NEW.user_id, NEW.amount, v_author_earnings, v_wistaar_earnings, NEW.purchased_at);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
