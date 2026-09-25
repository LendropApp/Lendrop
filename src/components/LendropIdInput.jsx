import { Link } from 'react-router-dom'
import { formatLendropId } from '../lib/lendropId'

/**
 * The Lendrop ID field used at the locker. Formats as the user types
 * (abc123 -> ABC-123) and drops characters a code can never contain.
 * `value` is the formatted string; the Edge Function normalises it again.
 */
export default function LendropIdInput({ id, value, onChange, className = '' }) {
  return (
    <div className={className}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(formatLendropId(e.target.value))}
        placeholder="ABC-123"
        aria-label="Lendrop ID"
        aria-describedby={id ? `${id}-hint` : undefined}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={7}
        required
        className="locker-code w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-base tracking-[0.2em] outline-none focus:border-primary"
      />
      <p id={id ? `${id}-hint` : undefined} className="mt-1.5 text-xs text-text-muted">
        Your private Lendrop ID is on your{' '}
        <Link to="/profile" className="font-semibold text-primary underline">
          profile
        </Link>
        .
      </p>
    </div>
  )
}
