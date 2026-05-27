-- 1. Platform settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_fee_percent NUMERIC NOT NULL DEFAULT 10,
  platform_fee_label TEXT NOT NULL DEFAULT 'Platform fee',
  wisties_refund_window_hours INT NOT NULL DEFAULT 36,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Wisties balance table
CREATE TABLE IF NOT EXISTS public.wisties_balance (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.wisties_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own balance"
  ON public.wisties_balance FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Wisties transactions table
CREATE TYPE wisties_transaction_type AS ENUM ('refund', 'purchase_spend', 'promo', 'admin_adjustment');

CREATE TABLE IF NOT EXISTS public.wisties_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type wisties_transaction_type NOT NULL,
  reference_id TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.wisties_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own transactions"
  ON public.wisties_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all transactions"
  ON public.wisties_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Credit/Debit functions
CREATE OR REPLACE FUNCTION public.credit_wisties(
  p_user_id UUID, 
  p_amount NUMERIC, 
  p_type wisties_transaction_type, 
  p_ref TEXT, 
  p_desc TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update balance
  INSERT INTO public.wisties_balance (user_id, balance, updated_at)
  VALUES (p_user_id, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE 
  SET balance = public.wisties_balance.balance + p_amount,
      updated_at = now();

  -- Record transaction
  INSERT INTO public.wisties_transactions (user_id, amount, type, reference_id, description)
  VALUES (p_user_id, p_amount, p_type, p_ref, p_desc);
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_wisties(
  p_user_id UUID, 
  p_amount NUMERIC, 
  p_type wisties_transaction_type, 
  p_ref TEXT, 
  p_desc TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- Lock the row for update
  SELECT balance INTO v_current_balance
  FROM public.wisties_balance
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient Wisties balance';
  END IF;

  UPDATE public.wisties_balance
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO public.wisties_transactions (user_id, amount, type, reference_id, description)
  VALUES (p_user_id, -p_amount, p_type, p_ref, p_desc);
END;
$$;

-- Add admin function to adjust balance
CREATE OR REPLACE FUNCTION public.admin_adjust_wisties(
  p_user_id UUID, 
  p_amount NUMERIC, 
  p_desc TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount >= 0 THEN
    PERFORM credit_wisties(p_user_id, p_amount, 'admin_adjustment', NULL, p_desc);
  ELSE
    PERFORM debit_wisties(p_user_id, abs(p_amount), 'admin_adjustment', NULL, p_desc);
  END IF;
END;
$$;

-- Purchase book with Wisties
CREATE OR REPLACE FUNCTION public.purchase_book_with_wisties(
  p_book_id UUID,
  p_amount NUMERIC,
  p_book_title TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tx_id TEXT := 'WISTIES_' || extract(epoch from now())::text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Debit wisties (this throws if insufficient balance)
  PERFORM debit_wisties(v_user_id, p_amount, 'purchase_spend', p_book_id::text, 'Purchased book: ' || p_book_title);

  -- 2. Insert into book_purchases
  INSERT INTO public.book_purchases (user_id, book_id, amount, payment_status, transaction_id)
  VALUES (v_user_id, p_book_id, p_amount, 'completed', v_tx_id);
END;
$$;
