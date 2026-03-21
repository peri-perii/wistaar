
-- Create a security definer function to check super admin status (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE user_id = _user_id AND is_super_admin = true
  )
$$;

-- Drop the recursive RLS policies on admin_permissions
DROP POLICY IF EXISTS "Super admins can manage permissions" ON public.admin_permissions;
DROP POLICY IF EXISTS "Admins can view own permissions" ON public.admin_permissions;

-- Re-create policies using the security definer function (no more recursion)
CREATE POLICY "Super admins can manage permissions"
ON public.admin_permissions
FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view own permissions"
ON public.admin_permissions
FOR SELECT
USING (auth.uid() = user_id);
