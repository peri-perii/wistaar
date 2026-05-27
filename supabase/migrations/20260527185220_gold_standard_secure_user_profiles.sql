-- 1. Drop the old view first to break dependencies
DROP VIEW IF EXISTS public.user_profiles;

-- 2. Drop email column from public.profiles table (keep public.profiles safe and public)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- 3. Create a private user_emails table with dedicated RLS policies
CREATE TABLE IF NOT EXISTS public.user_emails (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email character varying(255) NOT NULL
);

-- Enable Row Level Security (RLS) on the private emails table
ALTER TABLE public.user_emails ENABLE ROW LEVEL SECURITY;

-- Create policies so that only the user, admins, super admins, or service_role can query the email
CREATE POLICY "Users can read own email"
  ON public.user_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all emails"
  ON public.user_emails FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_super_admin(auth.uid())
  );

-- 4. Backfill all existing emails into the user_emails table
INSERT INTO public.user_emails (user_id, email)
SELECT id, email
FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

-- 5. Update the handle_new_user trigger function to safely write profile and email separately
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert clean profile info
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(NULLIF(profiles.display_name, ''), EXCLUDED.display_name),
    avatar_url = COALESCE(NULLIF(profiles.avatar_url, ''), EXCLUDED.avatar_url);

  -- Insert email privately
  INSERT INTO public.user_emails (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- 6. Update synchronization function for email updates
CREATE OR REPLACE FUNCTION public.handle_update_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    INSERT INTO public.user_emails (user_id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Recreate user_profiles view using best-practice security_invoker = on
-- This forces the view query execution context to obey RLS policies of underlying tables (public.user_emails)
CREATE OR REPLACE VIEW public.user_profiles
WITH (security_invoker = on) AS
SELECT 
  p.user_id as id,
  e.email::character varying(255) as email,
  p.display_name,
  p.avatar_url,
  p.username
FROM public.profiles p
LEFT JOIN public.user_emails e ON e.user_id = p.user_id;

-- Re-grant access on public.user_profiles
GRANT SELECT ON public.user_profiles TO authenticated, anon, service_role;
