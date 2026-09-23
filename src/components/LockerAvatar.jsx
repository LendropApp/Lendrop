import { User } from 'lucide-react'

// User avatar, reused in product cards, header, profile, and the lender
// dashboard so the same element is consistent across the app.
//
// Square with a 6px radius, not a circle: DESIGN.md sec. 4 puts every surface
// on radius-door and reserves the only circle in the system for the LED dot.
// The verified marker is that LED (sec. 7.3), so it stays round — and it holds
// still rather than pulsing, since a continuous animation on a decorative dot
// is exactly what sec. 8 rules out.

const SIZES = {
  sm: {
    frame: 'size-5',
    text: 'text-[9px]',
    dot: 'size-1.5 -right-0.5 -top-0.5',
    icon: 'size-2.5',
  },
  md: {
    frame: 'size-9',
    text: 'text-label',
    dot: 'size-2 -right-0.5 -top-0.5',
    icon: 'size-4',
  },
  lg: {
    frame: 'size-20',
    text: 'text-display-m',
    dot: 'size-3.5 -right-1 -top-1',
    icon: 'size-8',
  },
}

export default function LockerAvatar({
  label,
  photoUrl,
  verified = false,
  size = 'sm',
  className = '',
}) {
  const s = SIZES[size] ?? SIZES.sm

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-tag border-2 border-ink bg-lilac-200 font-mono font-bold text-violet ${s.frame} ${s.text} ${className}`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={label || 'Avatar'} className="size-full object-cover" />
      ) : label ? (
        label[0].toUpperCase()
      ) : (
        <User className={`${s.icon} text-violet`} strokeWidth={2} aria-hidden="true" />
      )}

      {verified && (
        <span
          aria-hidden="true"
          className={`absolute rounded-full border-[1.5px] border-ink bg-lilac ${s.dot}`}
        />
      )}
    </span>
  )
}
