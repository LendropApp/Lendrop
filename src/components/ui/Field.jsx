import { AlertCircle } from 'lucide-react'
import { useId } from 'react'

/**
 * Field — the shared label / help / error shell for Input, Select and Textarea
 * (DESIGN.md sec. 7.2). Not exported to screens; use the three controls below it.
 *
 * Wiring it once here is what keeps aria-describedby honest: the help text and
 * the error message both have to reach the control, and the error has to win
 * without the help text disappearing from the accessibility tree.
 */
export function useFieldIds(idProp, { help, error }) {
  const auto = useId()
  const id = idProp ?? auto
  const helpId = help ? `${id}-help` : undefined
  const errorId = error ? `${id}-error` : undefined
  return {
    id,
    helpId,
    errorId,
    describedBy: [helpId, errorId].filter(Boolean).join(' ') || undefined,
  }
}

export default function Field({ id, label, help, error, helpId, errorId, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="font-sans text-small font-bold text-ink">
          {label}
          {required && (
            <span className="text-alert" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}

      {children}

      {help && !error && (
        <p id={helpId} className="text-small text-steel-600">
          {help}
        </p>
      )}

      {/* Icon + text, never colour alone (sec. 10). aria-live so a validation
          message that appears after submit is announced without moving focus. */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-small font-medium text-alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

// Shared control skin. 48px tall, 16px text — below 16px iOS zooms the page on
// focus, which reads as a layout bug (sec. 7.2 + sec. 10).
export const CONTROL =
  'min-h-12 w-full rounded-door border-2 bg-panel px-3 text-body text-ink ' +
  'shadow-hard-sm transition-colors placeholder:text-steel-600 ' +
  'focus:border-violet disabled:bg-steel-300 disabled:text-steel-600 disabled:shadow-none'

export const CONTROL_OK = 'border-ink'
export const CONTROL_ERROR = 'border-alert'
