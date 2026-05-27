-- Secure user_profiles view to prevent exposing all users' emails to anonymous or standard users.
-- Only allows a user to see their own email, or admins/super-admins/service_role to see all emails.

DROP VIEW IF EXISTS public.user_profiles;

CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  u.id,
  CASE 
    WHEN u.id = auth.uid() 
         OR public.has_role(auth.uid(), 'admin'::public.app_role) 
         OR public.is_super_admin(auth.uid()) 
         OR current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin') THEN u.email
    ELSE NULL
  END::character varying(255) as email,
  p.display_name,
  p.avatar_url,
  p.username
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id;

-- Re-grant access to roles
GRANT SELECT ON public.user_profiles TO authenticated, anon, service_role;
