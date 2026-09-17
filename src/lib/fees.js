// Lendrop's platform transaction fee — deducted from the lender's payout
// once a rental's payment is processed, waived entirely for Premium lenders.
// Tiers are based on the rental's subtotal (price_per_day × days):
//   up to $100 -> 5%
//   up to $300 -> 10%
//   up to $700 -> 15% ($700 is the platform's maximum transaction value)
export const MAX_TRANSACTION_AMOUNT = 700

export function getFeeRate(amount) {
  if (amount <= 100) return 0.05
  if (amount <= 300) return 0.1
  return 0.15
}

export function calculatePlatformFee(amount, isPremium) {
  if (isPremium || !(amount > 0)) {
    return { rate: 0, feeAmount: 0, netAmount: Math.max(amount, 0) }
  }
  const rate = getFeeRate(amount)
  const feeAmount = Math.round(amount * rate * 100) / 100
  return { rate, feeAmount, netAmount: Math.round((amount - feeAmount) * 100) / 100 }
}
