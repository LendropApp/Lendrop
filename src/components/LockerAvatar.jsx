import { User } from 'lucide-react'

// Circular user avatar, reused in product cards, header, profile, and the
// lender dashboard so the same element is consistent across the app.

const SIZES = {
  sm: {
    frame: 'h-5 w-5',
    text: 'text-[9px]',
    dot: 'h-1.5 w-1.5 -right-0.5 -top-0.5',
    icon: 'h-2.5 w-2.5',
  },
  md: {
    frame: 'h-9 w-9',
    text: 'text-xs',
    dot: 'h-2 w-2 -right-0.5 -top-0.5',
    icon: 'h-4 w-4',
  },
  lg: {
    frame: 'h-20 w-20',
    text: 'text-2xl',
    dot: 'h-3.5 w-3.5 -right-1 -top-1',
    icon: 'h-8 w-8',
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
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-raised font-display font-bold text-primary ${s.frame} ${s.text} ${className}`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={label || 'Avatar'} className="h-full w-full object-cover" />
      ) : label ? (
        label[0].toUpperCase()
      ) : (
        <User className={`${s.icon} text-primary`} strokeWidth={1.75} />
      )}

      {verified && (
        <span
          className={`absolute rounded-full bg-lavender ring-2 ring-surface ${s.dot}`}
        />
      )}
    </span>
  )
}