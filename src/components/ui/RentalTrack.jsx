import LedStatus from './LedStatus'

/**
 * RentalTrack — DESIGN.md sec. 7.7. The rental timeline.
 *
 * Numbered steps are allowed here (and nowhere else): a rental IS an ordered
 * physical sequence, so the numbers describe reality rather than decorate it.
 *
 * Props:
 *   current  index of the active step (0-based). Everything before it is done.
 *   steps    optional override of the default five (sec. 7.7)
 *
 * Horizontal from md up, vertical below. The <ol> carries the order for screen
 * readers; each step states its own status in text, not by fill colour alone.
 */
export const DEFAULT_STEPS = ['Paid', 'In locker', 'Picked up', 'Returned', 'Closed']

export default function RentalTrack({ current = 0, steps = DEFAULT_STEPS, className = '' }) {
  return (
    <ol className={`flex flex-col gap-2 md:flex-row md:gap-3 ${className}`}>
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current

        const skin = done
          ? 'bg-lilac border-ink'
          : active
            ? 'bg-signal border-ink shadow-hard-sm'
            : 'bg-panel border-dashed border-steel-600'

        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={`flex flex-1 items-center gap-3 rounded-door border-2 p-3 md:flex-col md:items-start md:gap-2 ${skin}`}
          >
            <span
              className={`font-mono text-label ${done || active ? 'text-ink' : 'text-steel-600'}`}
            >
              {String(i + 1).padStart(2, '0')}
            </span>

            <span className="flex flex-1 items-center justify-between gap-2 md:w-full">
              <span
                className={`font-sans text-small font-bold uppercase ${
                  done || active ? 'text-ink' : 'text-steel-600'
                }`}
              >
                {label}
              </span>
              {active && <LedStatus status="reserved" label="In progress" compact />}
            </span>

            <span className="sr-only">
              {done ? 'Completed' : active ? 'In progress' : 'Pending'}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
