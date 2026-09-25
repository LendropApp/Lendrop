/**
 * A reservation's status as a shape plus a word, never colour alone, so it
 * reads the same in dark mode and for colour-blind users. One shape per
 * value of the `reservation_status` enum:
 *
 *   pending    hollow circle   waiting on payment
 *   confirmed  filled square   locked in
 *   active     filled triangle in progress
 *   completed  square + tick   closed out
 *   cancelled  struck circle   void
 *   disputed   diamond         needs attention
 */
const STATUSES = {
  pending: { label: 'Pending', tone: 'text-text-muted' },
  confirmed: { label: 'Confirmed', tone: 'text-primary' },
  active: { label: 'Active', tone: 'text-primary' },
  completed: { label: 'Completed', tone: 'text-success' },
  cancelled: { label: 'Cancelled', tone: 'text-text-muted' },
  disputed: { label: 'In dispute', tone: 'text-danger' },
}

function StatusShape({ status }) {
  const common = { width: 12, height: 12, viewBox: '0 0 12 12', 'aria-hidden': true, className: 'shrink-0' }

  switch (status) {
    case 'confirmed':
      return (
        <svg {...common}>
          <rect x="1" y="1" width="10" height="10" rx="1.5" fill="currentColor" />
        </svg>
      )
    case 'active':
      return (
        <svg {...common}>
          <path d="M2 1.5 L11 6 L2 10.5 Z" fill="currentColor" />
        </svg>
      )
    case 'completed':
      return (
        <svg {...common}>
          <rect x="1" y="1" width="10" height="10" rx="1.5" fill="currentColor" />
          <path d="M3.5 6.2 L5.3 8 L8.7 4.2" fill="none" stroke="var(--bg)" strokeWidth="1.6" />
        </svg>
      )
    case 'cancelled':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2.6 9.4 L9.4 2.6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case 'disputed':
      return (
        <svg {...common}>
          <path d="M6 0.8 L11.2 6 L6 11.2 L0.8 6 Z" fill="currentColor" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
  }
}

export default function RentalStatus({ status, className = '' }) {
  const { label, tone } = STATUSES[status] ?? STATUSES.pending

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone} ${className}`}>
      <StatusShape status={status} />
      {label}
    </span>
  )
}
