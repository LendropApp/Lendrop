import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Modal / BottomSheet — DESIGN.md sec. 7.8.
 *
 * One component, two presentations: a bottom sheet that rises like a sliding
 * door below md, a centred modal above it. Overlay is `night` at 60%.
 *
 * Props:
 *   open      boolean
 *   onClose   called by Escape, the overlay, and the close button
 *   title     string — required, it labels the dialog for screen readers
 *   footer    node pinned under the scrollable body (action buttons)
 *   children  the body
 *
 * Accessibility, all of it required by sec. 7.8 + sec. 10: Escape closes, Tab
 * cycles inside the panel, background scroll is locked, and focus returns to
 * whatever opened it.
 *
 * Portalled to <body> for the same reason MobileNav is: the app headers carry
 * backdrop-filter, which makes them a containing block for fixed descendants
 * and would clip this to the header's box.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, footer, children, className = '' }) {
  const panelRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    const previouslyFocused = document.activeElement

    const focusables = () => Array.from(panel?.querySelectorAll(FOCUSABLE) ?? [])
    focusables()[0]?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.()
        return
      }
      if (event.key !== 'Tab') return

      const list = focusables()
      if (list.length === 0) return

      const first = list[0]
      const last = list[list.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 size-full cursor-default bg-night/60"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`anim-sheet relative flex max-h-[90vh] w-full flex-col border-t-[3px] border-ink bg-panel md:max-w-lg md:rounded-door md:border-[3px] md:shadow-hard-lg ${className}`}
      >
        {/* Drag handle (sec. 7.8) — sheet affordance on mobile only. */}
        <span
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-[2px] bg-steel-300 md:hidden"
        />

        <div className="flex items-start justify-between gap-3 border-b-2 border-ink p-4">
          <h2 id={titleId} className="font-display text-display-m uppercase text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-1 shrink-0 rounded-door border-2 border-ink bg-panel p-1.5 press-sm"
          >
            <X className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {footer && <div className="border-t-2 border-ink p-4">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
