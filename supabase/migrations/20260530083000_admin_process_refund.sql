-- ============================================================
-- MIGRATION: Atomic admin refund function
-- ============================================================
-- Replaces the broken 4-step admin refund that was silently
-- failing at the DELETE step because there was no DELETE RLS
-- policy on book_purchases. This SECURITY DEFINER function
-- bypasses RLS and does everything atomically in one transaction.

CREATE OR REPLACE FUNCTION public.admin_process_refund(
  p_user_id    UUID,
  p_book_id    UUID,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase      RECORD;
  v_refund_amount NUMERIC;
  v_desc          TEXT;
BEGIN
  -- Admin-only guard
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  -- Find the completed purchase
  SELECT id, amount INTO v_purchase
  FROM public.book_purchases
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND payment_status = 'completed'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No completed purchase found for this user and book';
  END IF;

  v_refund_amount := v_purchase.amount;
  v_desc := COALESCE(p_description, 'Refund for book (ID: ' || p_book_id::text || ')');

  -- Credit Wisties
  PERFORM public.credit_wisties(
    p_user_id,
    v_refund_amount,
    'refund',
    p_book_id::text,
    v_desc
  );

  -- Remove the purchase record (removes book from library)
  DELETE FROM public.book_purchases WHERE id = v_purchase.id;

  -- In-app notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    p_user_id,
    '✅ Refund Processed',
    'Your refund of ₹' || v_refund_amount::text || ' has been credited to your Wisties balance. The book has been removed from your library.',
    'refund_processed'
  );

  RETURN jsonb_build_object('refund_amount', v_refund_amount);
END;
$$;
