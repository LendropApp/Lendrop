import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

// Landing-page demonstration for "Every handoff leaves a record": a locker
// wall where compartments change hands, and each change lands as a row in
// the locker log beside it. It runs continuously. Everything here is
// sample data and is labelled as such on the page.

const ITEMS = [
  { code: 'A1', item: 'Sony camera kit', photo: 'photo-1516035069371-29a1b244cc32' },
  { code: 'A2', item: 'Cordless drill', photo: 'photo-1504148455328-c376907d081c' },
  { code: 'A3', item: 'DJI drone', photo: 'photo-1527977966376-1c8408f9f108' },
  { code: 'A4', item: 'Polaroid camera', photo: 'photo-1526170375885-4d8ecf77b99f' },
  { code: 'B1', item: 'Acoustic guitar', photo: 'photo-1510915361894-db8b60106cb1' },
  { code: 'B2', item: 'City bike', photo: 'photo-1485965120184-e220f721d03e' },
  { code: 'B3', item: 'Hard-shell suitcase', photo: 'photo-1565026057447-bc90a3dceb87' },
  { code: 'B4', item: 'Bookshelf speaker', photo: 'photo-1545454675-3531b543be5d' },
  { code: 'C1', item: '4-person tent', photo: 'photo-1504280390367-361c6d9f38f4' },
  { code: 'C2', item: 'PlayStation 5', photo: 'photo-1606813907291-d86efa9b94db' },
  { code: 'C3', item: 'Vlogging kit', photo: 'photo-1526406915894-7bcd65f60845' },
  { code: 'C4', item: 'MacBook Pro', photo: 'photo-1517336714731-489689fd1ca8' },
]

// One handoff, as the locker_events table records it. `state` is what the
// compartment shows after the step; `inLocker` says whether the item is
// physically there. The cycle wraps so the demo can run indefinitely.
const STEPS = [
  { who: 'Owner', text: (item) => `deposited ${item}, photo attached`, state: 'Ready', inLocker: true },
  { who: 'Renter', text: (item) => `picked up ${item}, identity checked`, state: 'Rented', inLocker: false },
  { who: 'Renter', text: (item) => `returned ${item}, photo attached`, state: 'Returned', inLocker: true },
  { who: 'Owner', text: (item) => `collected ${item}`, state: 'Collected', inLocker: false },
]

const TICK_MS = 2600
const FLASH_MS = 1200
const LOG_ROWS = 4

function formatTime(minutes) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function photoUrl(id) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=320&h=280&q=70`
}

// Index of the step each compartment performs next; the state it shows is
// the step before it. Spread out so the wall doesn't start uniform.
const INITIAL_NEXT = [1, 2, 0, 3, 1, 3, 2, 0, 1, 2, 3, 1]

function currentStep(next) {
  return STEPS[(next + STEPS.length - 1) % STEPS.length]
}

function initialLog() {
  return [
    { id: 3, time: 9 * 60 + 40, code: 'B1', who: 'Owner', text: STEPS[0].text(ITEMS[4].item) },
    { id: 2, time: 9 * 60 + 26, code: 'A2', who: 'Renter', text: STEPS[1].text(ITEMS[1].item) },
    { id: 1, time: 9 * 60 + 12, code: 'A1', who: 'Owner', text: STEPS[0].text(ITEMS[0].item) },
  ]
}

export default function LockerLogDemo() {
  const [next, setNext] = useState(INITIAL_NEXT)
  const [log, setLog] = useState(initialLog)
  const [flashCode, setFlashCode] = useState(null)
  const [selected, setSelected] = useState(null)
  const [playing, setPlaying] = useState(true)
  const [visible, setVisible] = useState(true)

  const rootRef = useRef(null)
  const nextRef = useRef(INITIAL_NEXT)
  const lastIndex = useRef(-1)
  const clock = useRef(9 * 60 + 40)
  const nextId = useRef(4)

  // Skip ticks while scrolled out of view; it picks up where it left off.
  useEffect(() => {
    const node = rootRef.current
    if (!node) return undefined
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!playing || !visible) return undefined

    let flashTimer
    const interval = setInterval(() => {
      if (document.hidden) return

      // Never the same compartment twice in a row, so the wall keeps moving.
      let index
      do index = Math.floor(Math.random() * ITEMS.length)
      while (index === lastIndex.current)
      lastIndex.current = index
      const { code, item } = ITEMS[index]

      // Computed outside the state updaters: StrictMode runs updaters twice
      // in development, which would log every event twice.
      const step = STEPS[nextRef.current[index]]
      const updated = [...nextRef.current]
      updated[index] = (updated[index] + 1) % STEPS.length
      nextRef.current = updated
      clock.current += 4 + Math.floor(Math.random() * 30)
      const row = { id: nextId.current++, time: clock.current, code, who: step.who, text: step.text(item) }

      setNext(updated)
      setLog((rows) => [row, ...rows].slice(0, LOG_ROWS))
      setFlashCode(code)
      clearTimeout(flashTimer)
      flashTimer = setTimeout(() => setFlashCode(null), FLASH_MS)
    }, TICK_MS)

    return () => {
      clearInterval(interval)
      clearTimeout(flashTimer)
    }
  }, [playing, visible])

  return (
    <figure ref={rootRef} className="self-start rounded-2xl border border-border bg-surface lg:col-span-7">
      <figcaption className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <span className="font-bold">
          Locker <span className="locker-code font-normal text-text-muted">· Downtown San Salvador</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="hidden text-xs text-text-muted sm:inline">Sample data</span>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause the locker demo' : 'Play the locker demo'}
            className="cta-outline flex h-8 w-8 items-center justify-center rounded-lg"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        </span>
      </figcaption>

      {/* The wall */}
      <div className="grid grid-cols-3 gap-2.5 p-4 sm:grid-cols-4" role="group" aria-label="Compartments">
        {ITEMS.map(({ code, item, photo }, index) => {
          const { state, inLocker } = currentStep(next[index])
          const flashing = flashCode === code
          const isSelected = selected === code
          return (
            <button
              key={code}
              type="button"
              onClick={() => setSelected((s) => (s === code ? null : code))}
              aria-pressed={isSelected}
              aria-label={`Compartment ${code}, ${item}, ${state}`}
              className={`locker-cell group rounded-xl border p-2 text-left ${
                isSelected ? 'border-primary bg-surface-raised' : 'border-border bg-surface'
              } ${flashing ? 'is-flashing' : ''}`}
            >
              <span className="mb-1.5 flex items-center justify-between">
                <span className={`locker-code text-xs font-medium ${isSelected ? 'text-primary' : 'text-text-muted'}`}>
                  {code}
                </span>
                <span className={`h-2 w-2 rounded-full ${inLocker ? 'bg-success' : 'bg-border'}`} aria-hidden="true" />
              </span>

              <span className="relative block aspect-[1.15] overflow-hidden rounded-lg border border-border bg-surface-raised">
                <img
                  src={photoUrl(photo)}
                  alt=""
                  loading="lazy"
                  className={`locker-photo h-full w-full object-cover ${inLocker ? '' : 'opacity-40 grayscale'}`}
                />
                {!inLocker && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="rounded-md bg-jet-black/75 px-2 py-0.5 text-xs font-semibold text-soft-white">
                      {state}
                    </span>
                  </span>
                )}
              </span>

              <span className={`mt-2 block truncate text-xs font-semibold ${isSelected ? 'text-primary' : 'text-text'}`}>
                {item}
              </span>
              <span className={`mt-0.5 block text-xs ${inLocker ? 'text-success' : 'text-text-muted'}`}>{state}</span>
            </button>
          )
        })}
      </div>

      {/* The log */}
      <ol className="border-t border-border px-5 py-2 text-sm" aria-label="Locker log, newest first">
        {log.map((row) => (
          <li
            key={row.id}
            className={`log-row grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 border-b border-border py-2.5 last:border-0 ${
              selected === row.code ? 'rounded-md bg-lavender/25' : ''
            }`}
          >
            <span className="locker-code pt-0.5 text-xs text-text-muted">
              {formatTime(row.time)} · {row.code}
            </span>
            <span className="min-w-0">
              <span className="font-semibold">{row.who}</span> <span className="text-text-muted">{row.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </figure>
  )
}
