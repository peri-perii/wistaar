
-- Create admin_permissions table to track which admins have limited permissions
CREATE TABLE public.admin_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  granted_by uuid NOT NULL,
  can_approve_reject boolean NOT NULL DEFAULT true,
  can_manage_coupons boolean NOT NULL DEFAULT false,
  can_manage_admins boolean NOT NULL DEFAULT false,
  is_super_admin boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all permissions
CREATE POLICY "Super admins can manage permissions"
ON public.admin_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_permissions ap
    WHERE ap.user_id = auth.uid() AND ap.is_super_admin = true
  )
);

-- Admins can view their own permissions
CREATE POLICY "Admins can view own permissions"
ON public.admin_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Create coupon_codes table
CREATE TABLE public.coupon_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL,
  min_purchase numeric NOT NULL DEFAULT 0,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;

-- Admins can manage coupons
CREATE POLICY "Admins can manage coupons"
ON public.coupon_codes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read active coupons (needed for validation)
CREATE POLICY "Anyone can read active coupons"
ON public.coupon_codes
FOR SELECT
USING (is_active = true);

-- Insert the main super admin permission record
INSERT INTO public.admin_permissions (user_id, granted_by, can_approve_reject, can_manage_coupons, can_manage_admins, is_super_admin)
SELECT 
  u.id,
  u.id,
  true,
  true,
  true,
  true
FROM auth.users u
WHERE lower(u.email) = lower('priyamj1502@gmail.com')
ON CONFLICT (user_id) DO UPDATE SET
  is_super_admin = true,
  can_approve_reject = true,
  can_manage_coupons = true,
  can_manage_admins = true;

-- Trigger for updated_at
CREATE TRIGGER update_admin_permissions_updated_at
  BEFORE UPDATE ON public.admin_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupon_codes_updated_at
  BEFORE UPDATE ON public.coupon_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
