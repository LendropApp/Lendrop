import { Link } from 'react-router-dom'
import { Clock, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react'
import { describeVerification } from '../lib/verification'

const TONES = {
  neutral: {
    wrap: 'border-border bg-surface-raised',
    icon: 'text-primary',
    Icon: ShieldAlert,
  },
  pending: {
    wrap: 'border-amber-200 bg-amber-50',
    icon: 'text-amber-600',
    Icon: Clock,
  },
  error: {
    wrap: 'border-red-200 bg-red-50',
    icon: 'text-red-500',
    Icon: ShieldX,
  },
}

/**
 * Explains why publishing/booking is blocked and links to /verification.
 * Renders nothing when the user is already verified, so call sites can
 * drop it in unconditionally.
 *
 * `action` is 'publish' or 'rent' — it only changes the wording.
 */
export default function VerificationNotice({ status, action = 'publish', className = '' }) {
  if (status === 'verified') return null

  const copy = describeVerification(status, action)
  const tone = TONES[copy.tone] ?? TONES.neutral
  const Icon = tone.Icon

  return (
    <div
      role="status"
      className={`rounded-2xl border p-4 ${tone.wrap} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon}`} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold text-text">{copy.title}</p>
          <p className="mt-1 text-sm text-text-muted">{copy.body}</p>
          <Link
            to="/verification"
            state={{ reason: action }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-contrast transition hover:opacity-90"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {copy.cta}
          </Link>
        </div>
      </div>
    </div>
  )
}
