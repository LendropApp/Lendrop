import LedStatus from './LedStatus'
import SizeTag from './SizeTag'

/**
 * DoorCard — DESIGN.md sec. 6.1. The item card IS a locker door.
 *
 * This is one of the two places the design spends its boldness, so the anatomy
 * is fixed: SizeTag top-left, LedStatus top-right, the handle slot on the right
 * edge at the photo's mid-height, 4:3 photo with a 2px rule under it.
 *
 * Props:
 *   title, photoUrl, alt
 *   price       number — rendered FLAT here, never as a PriceSticker (sec. 7.5)
 *   unit        default '/day'
 *   size        'S'|'M'|'L'|'XL' — items.required_locker_size
 *   estimated   items.dimensions_source === 'category_default'
 *   status      LedStatus status
 *   category    string shown above the title
 *   as, to, href, onClick — forwarded; pass react-router's Link as `as`
 */
function money(value) {
  if (typeof value !== 'number') return value
  // sec. 3: the canonical price is `$12`, so cents appear only when non-zero.
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`
}

export default function DoorCard({
  title,
  photoUrl,
  alt,
  price,
  unit = '/day',
  size,
  estimated = false,
  status = 'available',
  category,
  as: Tag = 'div',
  className = '',
  ...rest
}) {
  const interactive = Tag !== 'div'

  return (
    <Tag
      // flex-col, not block: the UA stylesheet gives <button> align-items:center,
      // so in a stretched grid row a card with a one-line title centred its own
      // contents and opened a gap above the photo. A flex column starts at the
      // top, which is also what sec. 5 means by doors aligning across a row.
      className={`group relative flex flex-col overflow-hidden rounded-door border-[3px] border-ink bg-panel text-left ${
        interactive ? 'press-md' : 'shadow-hard-md'
      } ${className}`}
      {...rest}
    >
      <div className="relative">
        <div className="aspect-[4/3] w-full border-b-2 border-ink bg-steel-300">
          {photoUrl && (
            <img
              src={photoUrl}
              alt={alt ?? title}
              loading="lazy"
              // The wrapper already reserves the 4:3 box, so the image loading
              // late can't shift anything below it.
              className="size-full object-cover"
            />
          )}
        </div>

        <div className="absolute left-2 top-2">
          <SizeTag size={size} estimated={estimated} />
        </div>

        <div className="absolute right-2 top-2 rounded-door border-2 border-ink bg-panel px-1.5 py-1">
          {/* Text visible from md up, sr-only below — the corner is too tight on
              a 360px grid, but the state must still be readable (sec. 6.1). */}
          <LedStatus status={status} compact className="md:hidden" />
          <LedStatus status={status} className="hidden md:inline-flex" />
        </div>

        {/* The handle slot: the ONE ornament sec. 6.1 allows. Decorative. */}
        <span
          aria-hidden="true"
          className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-[2px] bg-ink"
        />
      </div>

      <div className="flex flex-col gap-1 p-3">
        {category && (
          <span className="font-mono text-label uppercase text-steel-600">{category}</span>
        )}
        <h3 className="line-clamp-2 text-title text-ink">{title}</h3>
        {price != null && (
          <p className="mt-0.5 flex items-baseline gap-1">
            <span className="font-mono text-data text-ink">
              {money(price)}
            </span>
            <span className="text-small text-steel-600">{unit}</span>
          </p>
        )}
      </div>
    </Tag>
  )
}
