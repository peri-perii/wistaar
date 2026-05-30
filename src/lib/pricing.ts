/** Minimum book price (exclusive) required for Wisties to be applicable. */
export const WISTIES_THRESHOLD = 99;

/** Basic breakdown used for pure-cash purchases. */
export const calculatePriceBreakdown = (bookPrice: number, feePercent: number = 10) => {
  const platformFee = Number(((bookPrice * feePercent) / 100).toFixed(2));
  const authorEarnings = Number((bookPrice - platformFee).toFixed(2));

  return {
    authorEarnings,
    platformFee,
    buyerPays: bookPrice,
  };
};

/**
 * Calculate a Wisties + Cash split payment.
 *
 * Rules:
 * - Wisties are only applicable when bookPrice > WISTIES_THRESHOLD (₹99).
 * - User must always pay at least ₹99 in cash (the threshold amount).
 * - Wisties can cover at most (bookPrice - 99) rupees, capped by the user's balance.
 * - Platform fee (10%) is applied on the cash portion only.
 */
export const calculateSplitPayment = (
  bookPrice: number,
  wistiesBalance: number,
  feePercent: number = 10
) => {
  const canUseWisties = bookPrice > WISTIES_THRESHOLD;

  if (!canUseWisties) {
    const platformFee = Number(((bookPrice * feePercent) / 100).toFixed(2));
    return {
      canUseWisties: false,
      wistiesApplied: 0,
      cashBeforeFee: bookPrice,
      platformFee,
      cashTotal: Number((bookPrice + platformFee).toFixed(2)),
    };
  }

  // Max Wisties usable = the portion above the cash floor
  const maxWistiesApplicable = bookPrice - WISTIES_THRESHOLD;
  const wistiesApplied = Number(Math.min(wistiesBalance, maxWistiesApplicable).toFixed(2));

  const cashBeforeFee = Number((bookPrice - wistiesApplied).toFixed(2)); // always ≥ ₹99
  const platformFee   = Number(((cashBeforeFee * feePercent) / 100).toFixed(2));
  const cashTotal     = Number((cashBeforeFee + platformFee).toFixed(2));

  return {
    canUseWisties: true,
    wistiesApplied,
    cashBeforeFee,
    platformFee,
    cashTotal,
  };
};
