-- ============================================================
-- MIGRATION: Fix handle_book_purchase_sales trigger RLS issue
-- ============================================================
-- Bug fix: The trigger function handle_book_purchase_sales was
-- created as SECURITY INVOKER (the default), causing client-side
-- completed purchases to trigger inserts on book_sales that violate
-- Row-Level Security policies.
-- By redefining it as SECURITY DEFINER with search_path = public,
-- the trigger runs as database owner (superuser), completely
-- bypassing RLS restrictions on book_sales and guaranteeing safe,
-- atomic ledger writes for every successful purchase.

CREATE OR REPLACE FUNCTION public.handle_book_purchase_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD IS NULL OR OLD.payment_status IS DISTINCT FROM 'completed') THEN
    -- Prevent duplicate sales rows for the same purchase
    IF NOT EXISTS (
      SELECT 1 FROM public.book_sales
      WHERE book_id = NEW.book_id AND buyer_id = NEW.user_id
    ) THEN
      INSERT INTO public.book_sales (book_id, buyer_id, amount_paid, sold_at)
      VALUES (NEW.book_id, NEW.user_id, NEW.amount, NEW.purchased_at);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
