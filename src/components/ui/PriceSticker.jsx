/**
 * PriceSticker — DESIGN.md sec. 7.5.
 *
 * A stuck-on price label: `signal` fill, 2px ink border, rotated -2deg.
 * Sec. 7.5 limits it to the item detail page and the hero — on a card the
 * price stays flat, or the rotation becomes noise repeated 20 times.
 *
 * Props:
 *   amount  number | string — rendered as-is if a string, else $ + 2 decimals
 *   unit    string shown small after the amount (default '/day')
 */
export default function PriceSticker({ amount, unit = '/day', className = '' }) {
  // sec. 3: `$12`, with cents only when there are cents.
  const value =
    typeof amount !== 'number'
      ? amount
      : Number.isInteger(amount)
        ? `$${amount}`
        : `$${amount.toFixed(2)}`

  return (
    <span
      className={`inline-flex -rotate-2 items-baseline gap-1 rounded-door border-2 border-ink bg-signal px-3 py-1.5 shadow-hard-sm ${className}`}
    >
      <span className="font-mono text-data-lg text-ink">{value}</span>
      {unit && <span className="text-small font-medium text-ink/70">{unit}</span>}
    </span>
  )
}
