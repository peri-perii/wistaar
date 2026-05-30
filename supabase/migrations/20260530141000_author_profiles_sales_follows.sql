-- ============================================================
-- MIGRATION: Author profiles, details, books, sales, and follows
-- ============================================================

-- 1. Add email, role, and username to public.profiles if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'reader' CHECK (role IN ('reader', 'author', 'admin'));

-- Ensure email column is unique
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- Ensure username column is unique
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);

-- 2. Update handle_new_user trigger function to populate profiles.email and profiles.role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert clean profile info
  INSERT INTO public.profiles (user_id, display_name, avatar_url, email, role, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', ''),
    NEW.email,
    'reader',
    COALESCE(
      NEW.raw_user_meta_data ->> 'username', 
      'user_' || substring(md5(random()::text) from 1 for 8)
    )
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(NULLIF(profiles.display_name, ''), EXCLUDED.display_name),
    avatar_url = COALESCE(NULLIF(profiles.avatar_url, ''), EXCLUDED.avatar_url),
    email = EXCLUDED.email;

  -- Insert email privately
  INSERT INTO public.user_emails (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- 3. Backfill existing profiles with email, role, and username
UPDATE public.profiles p
SET 
  email = u.email,
  role = COALESCE(p.role, 'reader'),
  username = COALESCE(p.username, 'user_' || substring(p.id::text from 1 for 8))
FROM auth.users u
WHERE p.user_id = u.id;

-- 4. Create author_details table
CREATE TABLE IF NOT EXISTS public.author_details (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  total_sales INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payout_due NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  bank_details_added BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.author_details ENABLE ROW LEVEL SECURITY;

-- 5. Create books table
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover_url TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0.00),
  description TEXT,
  genre TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- 6. Create book_sales table
CREATE TABLE IF NOT EXISTS public.book_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  amount_paid NUMERIC(10,2) NOT NULL CHECK (amount_paid >= 0.00),
  author_earnings NUMERIC(10,2) NOT NULL CHECK (author_earnings >= 0.00),
  wistaar_earnings NUMERIC(10,2) NOT NULL CHECK (wistaar_earnings >= 0.00),
  sold_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.book_sales ENABLE ROW LEVEL SECURITY;

-- 7. Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT cannot_follow_self CHECK (follower_id <> following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- author_details policies
DROP POLICY IF EXISTS "Authors can view own details" ON public.author_details;
CREATE POLICY "Authors can view own details"
  ON public.author_details FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Authors can update own details" ON public.author_details;
CREATE POLICY "Authors can update own details"
  ON public.author_details FOR UPDATE
  USING (auth.uid() = profile_id);

-- books policies
DROP POLICY IF EXISTS "Anyone can view books" ON public.books;
CREATE POLICY "Anyone can view books"
  ON public.books FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authors can insert own books" ON public.books;
CREATE POLICY "Authors can insert own books"
  ON public.books FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update own books" ON public.books;
CREATE POLICY "Authors can update own books"
  ON public.books FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own books" ON public.books;
CREATE POLICY "Authors can delete own books"
  ON public.books FOR DELETE
  USING (auth.uid() = author_id);

-- book_sales policies
DROP POLICY IF EXISTS "Authors can view sales of own books" ON public.book_sales;
CREATE POLICY "Authors can view sales of own books"
  ON public.book_sales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_sales.book_id AND books.author_id = auth.uid()
    )
  );

-- follows policies
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
CREATE POLICY "Anyone can view follows"
  ON public.follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow others" ON public.follows;
CREATE POLICY "Users can unfollow others"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to handle split payment and update totals
CREATE OR REPLACE FUNCTION public.handle_book_purchase_earnings()
RETURNS TRIGGER AS $$
DECLARE
  v_author_id UUID;
  v_author_amt NUMERIC(10,2);
  v_wistaar_amt NUMERIC(10,2);
BEGIN
  -- Get author ID from book
  SELECT author_id INTO v_author_id FROM public.books WHERE id = NEW.book_id;
  
  IF v_author_id IS NOT NULL THEN
    -- Calculate split: 65% to author, 35% to Wistaar
    v_author_amt := ROUND(NEW.amount_paid * 0.65, 2);
    v_wistaar_amt := NEW.amount_paid - v_author_amt;
    
    -- Set earnings in book_sales row
    NEW.author_earnings := v_author_amt;
    NEW.wistaar_earnings := v_wistaar_amt;
    
    -- Insert/update author details dynamically
    INSERT INTO public.author_details (profile_id, total_sales, total_revenue, payout_due)
    VALUES (v_author_id, 1, v_author_amt, v_author_amt)
    ON CONFLICT (profile_id) DO UPDATE SET
      total_sales = author_details.total_sales + 1,
      total_revenue = author_details.total_revenue + v_author_amt,
      payout_due = author_details.payout_due + v_author_amt;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate split and update author stats
DROP TRIGGER IF EXISTS trg_book_sales_earnings ON public.book_sales;
CREATE TRIGGER trg_book_sales_earnings
  BEFORE INSERT ON public.book_sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_book_purchase_earnings();
