-- ============================================================
-- MIGRATION: Fix purchase_book_split_payment
-- ============================================================
-- Bug fix: old version used ON CONFLICT DO NOTHING which silently
-- skipped the purchase insert if any prior row existed.
-- Also wrapped the notification insert in a sub-block so a
-- notification failure can never roll back the purchase.

CREATE OR REPLACE FUNCTION public.purchase_book_split_payment(
  p_book_id        UUID,
  p_book_title     TEXT,
  p_wisties_amount NUMERIC,
  p_cash_amount    NUMERIC
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

  -- Record the completed purchase.
  -- DO UPDATE (not DO NOTHING) so a pre-existing pending/failed row
  -- gets promoted to completed instead of being silently skipped.
  INSERT INTO public.book_purchases
    (user_id, book_id, amount, payment_status, transaction_id, payu_txnid)
  VALUES
    (v_user_id, p_book_id, v_total, 'completed', v_tx_id, v_tx_id)
  ON CONFLICT (user_id, book_id)
    DO UPDATE SET
      payment_status = 'completed',
      amount         = EXCLUDED.amount,
      transaction_id = EXCLUDED.transaction_id,
      payu_txnid     = EXCLUDED.payu_txnid;

  -- In-app notification (best-effort; must not block the purchase)
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Notification failure must not roll back the purchase
    NULL;
  END;
END;
$$;
