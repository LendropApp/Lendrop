import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, PartyPopper } from 'lucide-react'

// Steps needed before a profile is "rental ready" — no schema beyond the
// existing profiles columns and the auth user's own confirmation status,
// so this stays a pure client-side checklist rather than a stored flag.
export function buildSteps(user, profile) {
  return [
    {
      id: 'email',
      label: 'Confirm your email',
      done: Boolean(user?.email_confirmed_at),
      to: null,
    },
    {
      id: 'photo',
      label: 'Add a profile photo',
      done: Boolean(profile?.avatar_url),
      to: '/profile/edit',
    },
    {
      id: 'bio',
      label: 'Write a short bio',
      done: Boolean(profile?.bio?.trim()),
      to: '/profile/edit',
    },
    {
      id: 'phone',
      label: 'Add a phone number',
      done: Boolean(profile?.phone?.trim()),
      to: '/profile/edit',
    },
  ]
}

export default function ProfileCompletion({ user, profile }) {
  const steps = buildSteps(user, profile)
  const done = steps.filter((s) => s.done).length
  const total = steps.length
  const pct = Math.round((done / total) * 100)
  const isHost = Boolean(profile?.is_host)
  const complete = done === total

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-text">
          {complete ? 'Your profile is ready' : 'Get your profile ready'}
        </h2>
        <span className="font-mono text-xs font-semibold text-primary">{pct}%</span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-1.5 rounded-full cta-brand transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {complete ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-text-muted">
          <PartyPopper className="h-4 w-4 text-primary" />
          You've completed every step. Renters will see a trustworthy, full profile.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-2.5 text-sm">
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-text-muted" />
              )}
              <span className={step.done ? 'flex-1 text-text-muted line-through' : 'flex-1 text-text-muted'}>
                {step.label}
              </span>
              {!step.done && step.to && (
                <Link to={step.to} className="shrink-0 text-xs font-semibold text-primary hover:underline">
                  Add
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {!isHost && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-raised px-3.5 py-2.5">
          <span className="text-xs text-text-muted">
            Bonus: become a lender and start earning from your things.
          </span>
          <Link to="/become-host" className="shrink-0 text-xs font-semibold text-primary hover:underline">
            Start
          </Link>
        </div>
      )}
    </section>
  )
}
