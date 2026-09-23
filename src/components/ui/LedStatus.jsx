/**
 * LedStatus — DESIGN.md sec. 7.3 + the state table in sec. 2.
 *
 * Props:
 *   status  'available' | 'reserved' | 'ready' | 'unavailable' | 'problem'
 *   label   overrides the default wording
 *   compact boolean — hides the text visually but keeps it for screen readers,
 *           for the tight corner of a DoorCard (sec. 6.1). The dot alone never
 *           carries the meaning.
 *
 * The LED is never the only signal: sec. 2 requires the state text alongside it,
 * so `compact` hides it with sr-only rather than dropping it.
 */
const STATES = {
  available: { label: 'Available', dot: 'bg-lilac', halo: 'ring-3 ring-lilac/35' },
  reserved: { label: 'Reserved', dot: 'bg-signal', halo: 'ring-3 ring-signal/35' },
  ready: {
    label: 'Ready for pickup',
    dot: 'bg-go anim-led',
    halo: 'ring-3 ring-go/35',
  },
  unavailable: { label: 'Unavailable', dot: 'bg-steel-300', halo: '' },
  problem: { label: 'Problem', dot: 'bg-alert', halo: 'ring-3 ring-alert/35' },
}

export default function LedStatus({ status = 'available', label, compact = false, className = '' }) {
  const state = STATES[status] ?? STATES.unavailable
  const text = label ?? state.label

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      title={compact ? text : undefined}
    >
      <span
        aria-hidden="true"
        className={`size-2.5 shrink-0 rounded-full border-[1.5px] border-ink transition-colors duration-200 ${state.dot} ${state.halo}`}
      />
      <span className={compact ? 'sr-only' : 'text-label font-mono uppercase text-ink'}>{text}</span>
    </span>
  )
}
