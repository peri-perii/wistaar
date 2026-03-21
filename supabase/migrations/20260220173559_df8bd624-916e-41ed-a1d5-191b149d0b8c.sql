
-- Function to add an admin by email (security definer to access auth.users)
CREATE OR REPLACE FUNCTION public.add_admin_by_email(
  target_email text,
  p_can_approve_reject boolean DEFAULT true,
  p_can_manage_coupons boolean DEFAULT false,
  p_can_manage_admins boolean DEFAULT false,
  p_granted_by uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Only super admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE user_id = auth.uid() AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Only super admins can add other admins';
  END IF;

  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower(target_email)
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email: %', target_email;
  END IF;

  -- Add admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Add admin permissions
  INSERT INTO public.admin_permissions (
    user_id, granted_by, can_approve_reject, can_manage_coupons, can_manage_admins, is_super_admin
  )
  VALUES (
    target_user_id, p_granted_by, p_can_approve_reject, p_can_manage_coupons, p_can_manage_admins, false
  )
  ON CONFLICT (user_id) DO UPDATE SET
    can_approve_reject = EXCLUDED.can_approve_reject,
    can_manage_coupons = EXCLUDED.can_manage_coupons,
    can_manage_admins = EXCLUDED.can_manage_admins,
    granted_by = EXCLUDED.granted_by;
END;
$$;

-- Function to get admin list with emails (security definer to access auth.users)
CREATE OR REPLACE FUNCTION public.get_admins_with_emails()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  granted_by uuid,
  can_approve_reject boolean,
  can_manage_coupons boolean,
  can_manage_admins boolean,
  is_super_admin boolean,
  created_at timestamptz,
  email text,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    ap.id,
    ap.user_id,
    ap.granted_by,
    ap.can_approve_reject,
    ap.can_manage_coupons,
    ap.can_manage_admins,
    ap.is_super_admin,
    ap.created_at,
    au.email::text,
    COALESCE(pr.display_name, au.email::text) as display_name
  FROM public.admin_permissions ap
  JOIN auth.users au ON au.id = ap.user_id
  LEFT JOIN public.profiles pr ON pr.user_id = ap.user_id
  ORDER BY ap.is_super_admin DESC, ap.created_at ASC;
END;
$$;
