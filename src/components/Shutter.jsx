/**
 * The brand's one signature moment: a ribbed Deep Purple shutter that
 * rolls up once to reveal what is behind it (an item in its compartment,
 * a confirmed rental, an item ready for pickup). Use it for those reveals only, not
 * as decoration on ordinary screens.
 *
 * The children are always rendered and readable; the shutter is a layer
 * on top that animates away. With reduced motion it is never shown.
 *
 * `label` is lettered on the shutter while it is down. Screen readers skip
 * the shutter entirely and read the revealed content.
 */
export default function Shutter({ label, children, className = '' }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {children}
      <div
        aria-hidden="true"
        className="shutter animate-shutter-roll pointer-events-none absolute inset-0 flex items-end justify-center pb-6"
      >
        {label && (
          <span className="font-display text-2xl font-extrabold [font-stretch:125%]">{label}</span>
        )}
        <span className="absolute inset-x-0 bottom-0 h-2 bg-jet-black/40" />
      </div>
    </div>
  )
}
