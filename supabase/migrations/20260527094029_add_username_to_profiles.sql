-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN username TEXT;

-- Case-insensitive unique index
CREATE UNIQUE INDEX idx_profiles_username_lower ON public.profiles(lower(username));

-- Format constraint: 3-30 chars, alphanumeric + underscores
ALTER TABLE public.profiles ADD CONSTRAINT chk_username_format CHECK (
  username IS NULL OR username ~ '^[a-zA-Z0-9_]{3,30}$'
);

-- Allow anyone to read usernames (for availability checks)
-- Users can already read their own profile via existing RLS.
-- Add a policy so users can check if a username is taken:
CREATE POLICY "Anyone can read usernames for availability"
  ON public.profiles FOR SELECT
  USING (true);

-- Create user_profiles view to map auth.users and profiles
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  u.id,
  u.email,
  p.display_name,
  p.avatar_url,
  p.username
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id;

GRANT SELECT ON public.user_profiles TO authenticated, anon, service_role;

