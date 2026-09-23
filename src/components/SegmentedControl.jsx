import { useRef } from 'react'

/**
 * SegmentedControl — a radio group that looks like a segmented button bar.
 *
 * Props:
 *   value     the selected option's value
 *   onChange  (value) => void
 *   options   [{ value, label, icon }] — icon is a Lucide component
 *   label     accessible name for the group (required; it is the only label
 *             the group gets, since the visible heading sits outside it)
 *   name      optional, for debugging/testing hooks
 *
 * Keyboard behaviour follows the WAI-ARIA radio group pattern rather than the
 * default tab-through-every-button: one stop in the tab order, arrows move
 * between options and select as they go. That is why only the selected option
 * has tabindex 0.
 */
export default function SegmentedControl({ value, onChange, options = [], label, className = '' }) {
  const refs = useRef([])

  function handleKeyDown(event, index) {
    const last = options.length - 1
    let next = null

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else return

    event.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex w-full gap-1 rounded-xl border border-border bg-surface-raised p-1 sm:w-auto ${className}`}
    >
      {options.map((option, index) => {
        const Icon = option.icon
        const selected = option.value === value

        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition sm:flex-none ${
              selected
                ? 'bg-primary text-primary-contrast'
                : 'text-text-muted hover:bg-surface hover:text-text'
            }`}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
