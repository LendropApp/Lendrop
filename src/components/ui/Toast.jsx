import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

/**
 * Toast — DESIGN.md sec. 7.9. Bottom corner, above the control panel on mobile.
 *
 * Props:
 *   tone      'success' | 'error' | 'info'
 *   message   string — use the SAME verb as the action that triggered it
 *             (sec. 9: 'Publish' -> 'Published'), never a generic 'Done'
 *   onClose   called by the dismiss button and by the auto-dismiss timer
 *   duration  ms before auto-dismiss; 0 disables it. Errors default to staying
 *             put, since the user may need to read and act on them.
 *
 * role=status + aria-live=polite (sec. 10) so it is announced without stealing
 * focus mid-task. Errors use role=alert to interrupt instead.
 */
const TONES = {
  success: { stripe: 'bg-go', Icon: CheckCircle2, label: 'Success' },
  error: { stripe: 'bg-alert', Icon: AlertCircle, label: 'Error' },
  info: { stripe: 'bg-lilac', Icon: Info, label: 'Note' },
}

export default function Toast({ tone = 'info', message, onClose, duration, className = '' }) {
  const ms = duration ?? (tone === 'error' ? 0 : 5000)

  useEffect(() => {
    if (!ms || !onClose) return
    const timer = setTimeout(onClose, ms)
    return () => clearTimeout(timer)
  }, [ms, onClose])

  if (!message) return null

  const { stripe, Icon, label } = TONES[tone] ?? TONES.info

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto flex w-full max-w-sm items-stretch overflow-hidden rounded-door border-[3px] border-ink bg-panel shadow-hard-md ${className}`}
    >
      <span aria-hidden="true" className={`w-2 shrink-0 ${stripe}`} />

      <div className="flex flex-1 items-start gap-2.5 p-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-ink" strokeWidth={2} aria-hidden="true" />
        <p className="flex-1 text-small font-medium text-ink">
          <span className="sr-only">{label}: </span>
          {message}
        </p>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss"
            className="-m-1 shrink-0 rounded-door p-1 text-steel-600 transition-colors hover:text-ink"
          >
            <X className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Fixed container for one or more toasts. Sits above the mobile control panel
 * (sec. 7.9) and clears the safe-area inset.
 */
export function ToastViewport({ children, className = '' }) {
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:items-end md:pb-[calc(1rem+env(safe-area-inset-bottom))] ${className}`}
    >
      {children}
    </div>
  )
}
