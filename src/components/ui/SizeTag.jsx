/**
 * SizeTag — DESIGN.md sec. 7.4. The stencilled locker size (S/M/L/XL).
 *
 * Props:
 *   size       'S' | 'M' | 'L' | 'XL'
 *   estimated  boolean — true when items.dimensions_source === 'category_default'.
 *              Adds the asterisk and tooltip required by sec. 6.1.
 *   large      boolean — the 72px version used on publish and detail (sec. 7.4)
 *   measurements  string shown under the large version, e.g. '40 x 30 x 25 cm'
 *
 * XL gets the `signal` fill and everything else `lilac-200`: the one size that
 * limits where an item can actually go is the one worth flagging.
 */
export default function SizeTag({
  size,
  estimated = false,
  large = false,
  measurements,
  className = '',
}) {
  if (!size) return null

  const code = String(size).toUpperCase()
  const fill = code === 'XL' ? 'bg-signal' : 'bg-lilac-200'
  const box = large ? 'size-18 text-[2.75rem]' : 'size-9 text-[1.375rem]'
  const hint = estimated ? `Locker size ${code}, estimated from the category` : `Locker size ${code}`

  return (
    <span className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <span
        title={hint}
        className={`relative inline-flex items-center justify-center rounded-tag border-2 border-ink font-stencil font-extrabold leading-none text-ink ${fill} ${box}`}
      >
        <span aria-hidden="true">{code}</span>
        {estimated && (
          <span aria-hidden="true" className="absolute -right-0.5 top-0 font-sans text-small leading-none">
            *
          </span>
        )}
        <span className="sr-only">{hint}</span>
      </span>

      {large && measurements && (
        <span className="text-label font-mono uppercase text-steel-600">{measurements}</span>
      )}
    </span>
  )
}
