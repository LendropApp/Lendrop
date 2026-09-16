import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Generic reading modal for legal documents (Terms of Service, Privacy
 * Policy). Closes on Escape, backdrop click, or the close button; locks
 * body scroll while open.
 */
export default function LegalModal({ open, onClose, title, children }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-jet-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-lavender/15 bg-white shadow-2xl shadow-lavender/25"
      >
        <div className="h-px shrink-0 bg-linear-to-r from-transparent via-lavender to-transparent" />

        <div className="flex shrink-0 items-center justify-between border-b border-jet-black/5 px-6 py-4 sm:px-8">
          <h2 id="legal-modal-title" className="font-display text-lg font-semibold text-deep-purple">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-jet-black/50 transition hover:bg-jet-black/5 hover:text-deep-purple focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 text-sm leading-relaxed text-jet-black/70 sm:px-8">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
