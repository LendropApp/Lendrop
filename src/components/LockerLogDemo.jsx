import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

// Landing-page demonstration for "Every handoff leaves a record": a small
// locker wall where compartments open as handoffs happen, and each opening
// lands as a row in the locker log beside it. Everything here is sample
// data and is labelled as such on the page.

const ITEMS = [
  { code: 'A1', item: 'Canon EOS R6', photo: 'photo-1516035069371-29a1b244cc32' },
  { code: 'A2', item: 'Bosch cordless drill', photo: 'photo-1504148455328-c376907d081c' },
  { code: 'A3', item: 'DJI Mini 4 drone', photo: 'photo-1527977966376-1c8408f9f108' },
  { code: 'B1', item: 'Yamaha acoustic guitar', photo: 'photo-1510915361894-db8b60106cb1' },
  { code: 'B2', item: 'Trek mountain bike', photo: 'photo-1485965120184-e220f721d03e' },
  { code: 'B3', item: 'Samsonite suitcase', photo: 'photo-1565026057447-bc90a3dceb87' },
  { code: 'C1', item: '4-person tent', photo: 'photo-1510312305653-8ed496efae75' },
  { code: 'C2', item: 'Nintendo Switch', photo: 'photo-1550745165-9bc0b252726f' },
  { code: 'C3', item: 'PlayStation 5', photo: 'photo-1606813907291-d86efa9b94db' },
]

// One handoff, as the locker_events table records it: each step opens the
// door once. The cycle wraps so the demo can run indefinitely.
const STEPS = [
  { who: 'Owner', text: (item) => `Deposited ${item}, photo attached`, state: 'Ready' },
  { who: 'Renter', text: (item) => `Picked up ${item}, identity checked`, state: 'Out' },
  { who: 'Renter', text: (item) => `Returned ${item}, photo attached`, state: 'Returned' },
  { who: 'Owner', text: (item) => `Collected ${item}`, state: 'Empty' },
]

const TICK_MS = 3200
const DOOR_OPEN_MS = 1700 // 700ms travel up + ~1s held open
const LOG_ROWS = 5

function formatTime(minutes) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function photoUrl(id) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=240&q=70`
}

// A spread of starting points so the wall doesn't begin uniform.
const INITIAL_STEP = [0, 1, 3, 2, 3, 0, 1, 3, 2]

function initialLog() {
  return [
    { id: 3, time: 9 * 60 + 40, code: 'B1', who: 'Renter', text: STEPS[2].text(ITEMS[3].item) },
    { id: 2, time: 9 * 60 + 26, code: 'A2', who: 'Renter', text: STEPS[1].text(ITEMS[1].item) },
    { id: 1, time: 9 * 60 + 12, code: 'A1', who: 'Owner', text: STEPS[0].text(ITEMS[0].item) },
  ]
}

export default function LockerLogDemo() {
  const [steps, setSteps] = useState(INITIAL_STEP)
  const [log, setLog] = useState(initialLog)
  const [openCode, setOpenCode] = useState(null)
  const [selected, setSelected] = useState(null)
  const [playing, setPlaying] = useState(true)
  const [visible, setVisible] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  const rootRef = useRef(null)
  const stepsRef = useRef(INITIAL_STEP)
  const clock = useRef(9 * 60 + 40)
  const nextId = useRef(4)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      setReducedMotion(query.matches)
      if (query.matches) setPlaying(false)
    }
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  // Only run while on screen and while the tab is visible.
  useEffect(() => {
    const node = rootRef.current
    if (!node) return undefined
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.25,
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!playing || !visible) return undefined

    let closeTimer
    const interval = setInterval(() => {
      if (document.hidden) return

      const index = Math.floor(Math.random() * ITEMS.length)
      const { code, item } = ITEMS[index]

      // Computed outside the state updaters: StrictMode runs updaters twice
      // in development, which would log every event twice.
      const step = STEPS[stepsRef.current[index]]
      const nextSteps = [...stepsRef.current]
      nextSteps[index] = (nextSteps[index] + 1) % STEPS.length
      stepsRef.current = nextSteps
      clock.current += 6 + Math.floor(Math.random() * 40)
      const row = { id: nextId.current++, time: clock.current, code, who: step.who, text: step.text(item) }

      setSteps(nextSteps)
      setLog((rows) => [row, ...rows].slice(0, LOG_ROWS))

      setOpenCode(code)
      clearTimeout(closeTimer)
      closeTimer = setTimeout(() => setOpenCode(null), DOOR_OPEN_MS)
    }, TICK_MS)

    return () => {
      clearInterval(interval)
      clearTimeout(closeTimer)
    }
  }, [playing, visible])

  return (
    <figure ref={rootRef} className="self-start rounded-2xl border border-border bg-bg lg:col-span-7">
      <figcaption className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <span className="font-bold">
          Locker <span className="locker-code font-normal text-text-muted">· Downtown</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="text-xs text-text-muted">Sample data</span>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={!playing}
            aria-label={playing ? 'Pause the locker demo' : 'Play the locker demo'}
            className="cta-outline flex h-8 w-8 items-center justify-center rounded-lg"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        </span>
      </figcaption>

      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* The wall */}
        <div className="grid grid-cols-3 gap-2 self-start" role="group" aria-label="Compartments">
          {ITEMS.map(({ code, item, photo }, index) => {
            const open = openCode === code
            const isSelected = selected === code
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSelected((s) => (s === code ? null : code))}
                aria-pressed={isSelected}
                aria-label={`Compartment ${code}, ${item}, ${STEPS[(steps[index] + STEPS.length - 1) % STEPS.length].state}`}
                className={`locker-cell relative aspect-square overflow-hidden rounded-lg border ${
                  isSelected ? 'border-lavender ring-2 ring-lavender' : 'border-border'
                } ${open ? 'is-open' : ''}`}
              >
                <img src={photoUrl(photo)} alt="" loading="lazy" className="h-full w-full object-cover" />
                <span className={`locker-door shutter absolute inset-0 flex flex-col justify-between p-1.5 text-left ${reducedMotion ? 'locker-door-static' : ''}`}>
                  <span className="locker-code text-xs font-medium text-soft-white">{code}</span>
                  <span className="text-xs font-semibold leading-none text-brand-surface-muted">
                    {STEPS[(steps[index] + STEPS.length - 1) % STEPS.length].state}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {/* The log */}
        <ol className="min-w-0 self-start text-sm" aria-label="Locker log, newest first">
          {log.map((row) => {
            const match = selected === row.code
            return (
              <li
                key={row.id}
                className={`log-row grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 border-b border-border py-2.5 last:border-0 ${
                  match ? 'rounded-md bg-lavender/25' : ''
                }`}
              >
                <span className="locker-code pt-0.5 text-xs text-text-muted">
                  {formatTime(row.time)} · {row.code}
                </span>
                <span className="min-w-0">
                  <span className="font-semibold">{row.who}</span>{' '}
                  <span className="text-text-muted">{row.text.charAt(0).toLowerCase() + row.text.slice(1)}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </figure>
  )
}
