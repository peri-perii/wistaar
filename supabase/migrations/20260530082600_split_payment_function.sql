-- ============================================================
-- MIGRATION: Hybrid Wisties + Cash Split Payment Function
-- ============================================================
-- Atomic function: debits Wisties and records a split purchase
-- in a single transaction. The cash portion is assumed settled
-- (mock for now; wire real payment gateway call before going live).

CREATE OR REPLACE FUNCTION public.purchase_book_split_payment(
  p_book_id      UUID,
  p_book_title   TEXT,
  p_wisties_amount NUMERIC,  -- amount covered by Wisties
  p_cash_amount  NUMERIC     -- amount the user paid in cash (after platform fee)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID   := auth.uid();
  v_total   NUMERIC := p_wisties_amount + p_cash_amount;
  v_tx_id   TEXT   := 'SPLIT_' || extract(epoch from now())::bigint::text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Debit Wisties only when there is a Wisties portion
  IF p_wisties_amount > 0 THEN
    PERFORM public.debit_wisties(
      v_user_id,
      p_wisties_amount,
      'purchase_spend',
      p_book_id::text,
      'Purchased "' || p_book_title || '" (Wisties portion)'
    );
  END IF;

  -- Record the completed purchase (upsert so duplicate calls are idempotent)
  INSERT INTO public.book_purchases
    (user_id, book_id, amount, payment_status, transaction_id, payu_txnid)
  VALUES
    (v_user_id, p_book_id, v_total, 'completed', v_tx_id, v_tx_id)
  ON CONFLICT (user_id, book_id) DO NOTHING;

  -- In-app notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    v_user_id,
    '📖 "' || p_book_title || '" is now in your library!',
    CASE
      WHEN p_wisties_amount > 0
        THEN 'Paid ₹' || p_wisties_amount::text || ' with Wisties + ₹' || p_cash_amount::text || ' cash. Happy reading!'
      ELSE 'Payment of ₹' || p_cash_amount::text || ' successful. Happy reading!'
    END,
    'book_purchased'
  );
END;
$$;
