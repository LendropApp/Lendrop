import { User } from 'lucide-react'

// Marco "locker compartment": insignia cuadrada redondeada con línea de
// costura al centro, ecoando las puertas físicas de los lockers.
// Reutilizado en tarjetas de producto, header, perfil y futuro dashboard
// de arrendador para que el elemento de marca sea consistente en toda la app.

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
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-6px border border-jet-black/10 bg-lavender/15 font-mono font-bold text-deep-purple after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-jet-black/10 ${s.frame} ${s.text} ${className}`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={label || 'Avatar'} className="h-full w-full object-cover" />
      ) : label ? (
        label[0].toUpperCase()
      ) : (
        <User className={`${s.icon} text-deep-purple/70`} strokeWidth={1.75} />
      )}

      {verified && (
        <span
          className={`absolute animate-pulse rounded-full bg-lavender ring-2 ring-soft-white ${s.dot}`}
        />
      )}
    </span>
  )
}