-- ============================================
-- MIGRATION 5: Admin System — Permissions, Coupons, Notifications
-- ============================================

-- Admin permissions table (must be created BEFORE is_super_admin function)
CREATE TABLE public.admin_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  granted_by UUID NOT NULL,
  can_approve_reject BOOLEAN NOT NULL DEFAULT true,
  can_manage_coupons BOOLEAN NOT NULL DEFAULT false,
  can_manage_admins BOOLEAN NOT NULL DEFAULT false,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_admin_permissions_updated_at
  BEFORE UPDATE ON public.admin_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Now create the is_super_admin function (table exists)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
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

-- RLS policies using the function
CREATE POLICY "Super admins can manage permissions"
  ON public.admin_permissions FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view own permissions"
  ON public.admin_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- Seed super admin for priyamj1502@gmail.com
INSERT INTO public.admin_permissions (user_id, granted_by, can_approve_reject, can_manage_coupons, can_manage_admins, is_super_admin)
SELECT u.id, u.id, true, true, true, true
FROM auth.users u
WHERE lower(u.email) = lower('priyamj1502@gmail.com')
ON CONFLICT (user_id) DO UPDATE SET
  is_super_admin = true,
  can_approve_reject = true,
  can_manage_coupons = true,
  can_manage_admins = true;

-- Coupon codes table
CREATE TABLE public.coupon_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  min_purchase NUMERIC NOT NULL DEFAULT 0,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupons"
  ON public.coupon_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active coupons"
  ON public.coupon_codes FOR SELECT
  USING (is_active = true);

CREATE TRIGGER update_coupon_codes_updated_at
  BEFORE UPDATE ON public.coupon_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to add admin by email (super admin only)
CREATE OR REPLACE FUNCTION public.add_admin_by_email(
  target_email TEXT,
  p_can_approve_reject BOOLEAN DEFAULT true,
  p_can_manage_coupons BOOLEAN DEFAULT false,
  p_can_manage_admins BOOLEAN DEFAULT false,
  p_granted_by UUID DEFAULT auth.uid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE user_id = auth.uid() AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Only super admins can add other admins';
  END IF;

  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower(target_email)
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email: %', target_email;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

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

-- Function to get admin list with emails (admin only)
CREATE OR REPLACE FUNCTION public.get_admins_with_emails()
RETURNS TABLE(
  id UUID,
  user_id UUID,
  granted_by UUID,
  can_approve_reject BOOLEAN,
  can_manage_coupons BOOLEAN,
  can_manage_admins BOOLEAN,
  is_super_admin BOOLEAN,
  created_at TIMESTAMPTZ,
  email TEXT,
  display_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
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
    au.email::TEXT,
    COALESCE(pr.display_name, au.email::TEXT) as display_name
  FROM public.admin_permissions ap
  JOIN auth.users au ON au.id = ap.user_id
  LEFT JOIN public.profiles pr ON pr.user_id = ap.user_id
  ORDER BY ap.is_super_admin DESC, ap.created_at ASC;
END;
$$;
