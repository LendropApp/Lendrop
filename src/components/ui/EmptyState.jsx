/**
 * EmptyState — DESIGN.md sec. 7.11.
 *
 * Six drawn empty compartments with ONE lit in lilac holding the call to
 * action. The grid is decorative, so it is aria-hidden and the message and
 * button carry the whole meaning.
 *
 * Props:
 *   title    string — says what is missing
 *   body     string — says what to do about it
 *   action   node (a Button) placed in the lit compartment's row
 *   litIndex which of the 6 compartments is lit (default 4, lower-middle)
 */
export default function EmptyState({ title, body, action, litIndex = 4, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-5 py-10 text-center ${className}`}>
      <div aria-hidden="true" className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={
              i === litIndex
                ? 'size-12 rounded-door border-2 border-ink bg-lilac shadow-hard-sm'
                : 'size-12 rounded-door border-2 border-dashed border-steel-600'
            }
          />
        ))}
      </div>

      <div className="flex max-w-sm flex-col gap-1.5">
        <h3 className="font-display text-display-m uppercase text-ink">{title}</h3>
        {body && <p className="text-body text-steel-600">{body}</p>}
      </div>

      {action}
    </div>
  )
}
