export const calculatePriceBreakdown = (bookPrice: number, feePercent: number = 10) => {
  const platformFee = Number(((bookPrice * feePercent) / 100).toFixed(2));
  const authorEarnings = Number((bookPrice - platformFee).toFixed(2));

  return {
    authorEarnings,
    platformFee,
    buyerPays: bookPrice,
  };
};
