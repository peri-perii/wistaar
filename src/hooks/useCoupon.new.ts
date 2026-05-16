import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";

export interface CouponData {
  code: string;
  discountPercentage?: number;
  discountAmount?: number;
  maximumDiscount?: number;
  isValid: boolean;
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: (code: string) => apiClient.validateCoupon(code),
    onError: (error) => {
      console.error('Coupon validation failed:', error);
    },
  });
}
