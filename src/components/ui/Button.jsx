/**
 * Button — DESIGN.md sec. 7.1
 *
 * Props:
 *   variant  'primary' | 'secondary' | 'signal' | 'danger' | 'ghost'  (default 'primary')
 *   size     'md' | 'sm'   'md' is 48px; 'sm' is 44px, the floor sec. 10 sets for a
 *                          touch target. 'sm' is for dense toolbars only, never for
 *                          a primary page action.
 *   loading  boolean       swaps the label for the compartment spinner + loadingLabel
 *   disabled boolean
 *   as       'button' | 'a' | React component (e.g. react-router Link)
 *   icon     lucide component, rendered before the label and aria-hidden
 *   onDark   set on a `night` background: `ghost` switches violet -> lilac,
 *            which is the only variant whose text sits directly on the page
 *   loadingLabel  string   defaults to 'Working…'
 *   ...rest  forwarded (type, onClick, to, href…)
 *
 * `signal` is the physical-action variant: at most ONE per screen (sec. 7.1),
 * reserved for the thing that moves a locker door.
 */

const VARIANTS = {
  primary: 'bg-violet text-panel border-[3px] border-ink press-md',
  secondary: 'bg-panel text-ink border-2 border-ink press-sm',
  signal: 'bg-signal text-ink border-[3px] border-ink press-md',
  danger: 'bg-alert-700 text-panel border-[3px] border-ink press-md',
  ghost: 'bg-transparent text-violet border-0 hover:underline underline-offset-4',
  // `violet` on `night` measures 1.67:1. sec. 2 allows lilac as a text colour
  // anywhere except panel/steel, and lilac on night measures 6.68:1.
  ghostOnDark: 'bg-transparent text-lilac border-0 hover:underline underline-offset-4',
}

// Disabled drops the border weight too — a flat plate reads as "no door here",
// which is the point: nothing to press.
const DISABLED = 'bg-steel-300 text-steel-600 border-2 border-steel-600/40 shadow-none'

const SIZES = {
  md: 'min-h-12 px-5 text-body',
  sm: 'min-h-11 px-3.5 text-small',
}

/**
 * The loading indicator from sec. 7.1: four cells lighting in sequence, like
 * compartments being checked one after another, rather than a spinning circle.
 * Staggered via inline animation-delay so it stays a single keyframe.
 */
function CompartmentSpinner() {
  return (
    <span aria-hidden="true" className="grid grid-cols-2 gap-0.5">
      {[0, 1, 3, 2].map((cell, i) => (
        <span
          key={cell}
          className="anim-cell size-1.5 border border-current"
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}
    </span>
  )
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  as: Tag = 'button',
  icon: Icon,
  onDark = false,
  loadingLabel = 'Working…',
  className = '',
  children,
  ...rest
}) {
  const isInert = disabled || loading
  const base =
    'inline-flex items-center justify-center gap-2 rounded-door font-sans font-bold ' +
    'transition-colors select-none'

  // Only `disabled` gets the dead plate. A loading button keeps its variant so
  // it still reads as the action in progress rather than as deactivated --
  // sec. 7.1 describes loading as a label swap, not a change of skin.
  const variantSkin =
    variant === 'ghost' && onDark ? VARIANTS.ghostOnDark : VARIANTS[variant] ?? VARIANTS.primary

  const skin = disabled
    ? variant === 'ghost'
      ? 'text-steel-600 no-underline'
      : DISABLED
    : variantSkin

  return (
    <Tag
      className={`${base} ${SIZES[size] ?? SIZES.md} ${skin} ${isInert ? 'cursor-not-allowed' : ''} ${className}`}
      // aria-disabled rather than the bare attribute on non-buttons: an <a> ignores
      // `disabled` entirely and would stay clickable and focusable.
      disabled={Tag === 'button' ? isInert : undefined}
      aria-disabled={Tag === 'button' ? undefined : isInert || undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <CompartmentSpinner />
          {loadingLabel}
        </>
      ) : (
        <>
          {Icon && <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />}
          {children}
        </>
      )}
    </Tag>
  )
}
