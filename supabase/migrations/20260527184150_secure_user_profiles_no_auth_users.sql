-- Secure user_profiles view without selecting from auth.users.
-- 1. Add email column to profiles table
-- 2. Backfill existing emails from auth.users to profiles
-- 3. Update handle_new_user() trigger to include email
-- 4. Create trigger to sync updates from auth.users.email to profiles.email
-- 5. Drop user_profiles view and recreate it, querying completely from public.profiles

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email character varying(255);

-- Backfill existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id;

-- Update auth.users new signup trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', ''),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(NULLIF(profiles.display_name, ''), EXCLUDED.display_name),
    avatar_url = COALESCE(NULLIF(profiles.avatar_url, ''), EXCLUDED.avatar_url);
  RETURN NEW;
END;
$$;

-- Create sync trigger for email updates
CREATE OR REPLACE FUNCTION public.handle_update_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET email = NEW.email
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_update_user_email();

-- Recreate user_profiles view without any dependency on auth.users
DROP VIEW IF EXISTS public.user_profiles;

CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  user_id as id,
  CASE 
    WHEN user_id = auth.uid() 
         OR public.has_role(auth.uid(), 'admin'::public.app_role) 
         OR public.is_super_admin(auth.uid()) 
         OR current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin') THEN email
    ELSE NULL
  END::character varying(255) as email,
  display_name,
  avatar_url,
  username
FROM public.profiles;

-- Re-grant access on public.user_profiles
GRANT SELECT ON public.user_profiles TO authenticated, anon, service_role;
