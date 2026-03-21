import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_purchase: number;
}

export function computeDiscount(coupon: AppliedCoupon, originalAmount: number): number {
  if (coupon.discount_type === "percentage") {
    return Math.min(originalAmount, (originalAmount * coupon.discount_value) / 100);
  }
  return Math.min(originalAmount, coupon.discount_value);
}

export function useCoupon(originalAmount: number) {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [validating, setValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const discount = appliedCoupon ? computeDiscount(appliedCoupon, originalAmount) : 0;
  const finalAmount = Math.max(0, originalAmount - discount);

  const validateCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    setValidating(true);
    setCouponError(null);

    try {
      const { data, error } = await supabase
        .from("coupon_codes" as any)
        .select("id, code, discount_type, discount_value, min_purchase, max_uses, uses_count, expires_at, is_active")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setCouponError("Invalid or inactive coupon code.");
        setAppliedCoupon(null);
        return;
      }

      const coupon = data as any;

      // Check expiry
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        setCouponError("This coupon has expired.");
        setAppliedCoupon(null);
        return;
      }

      // Check max uses
      if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
        setCouponError("This coupon has reached its usage limit.");
        setAppliedCoupon(null);
        return;
      }

      // Check min purchase
      if (originalAmount < coupon.min_purchase) {
        setCouponError(`Minimum purchase of ₹${coupon.min_purchase} required.`);
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon({
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_purchase: coupon.min_purchase,
      });
    } catch {
      setCouponError("Failed to validate coupon. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  const incrementUsage = async (couponId: string) => {
    // Fetch current uses_count then increment
    const { data } = await supabase
      .from("coupon_codes" as any)
      .select("uses_count")
      .eq("id", couponId)
      .single();
    const current = (data as any)?.uses_count ?? 0;
    await supabase
      .from("coupon_codes" as any)
      .update({ uses_count: current + 1 } as any)
      .eq("id", couponId);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  return {
    couponCode,
    setCouponCode,
    appliedCoupon,
    validating,
    couponError,
    discount,
    finalAmount,
    validateCoupon,
    removeCoupon,
    incrementUsage,
  };
}
