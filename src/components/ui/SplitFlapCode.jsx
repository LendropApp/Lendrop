import { useEffect, useState } from 'react'

/**
 * SplitFlapCode — DESIGN.md sec. 6.2. The opening code, revealed like a station
 * departure board.
 *
 * This is the ONE orchestrated moment in the app (sec. 6.2), used when a
 * reservation is confirmed and on "Your locker". Do not reuse the effect
 * elsewhere.
 *
 * Props:
 *   code   the final string, e.g. 'B4'
 *   label  mono caption under the cells
 *
 * Timing comes straight from the spec: each character cycles through 3-6 random
 * glyphs, characters start 60ms apart, and the whole reveal stays under 900ms.
 * That budget is what caps the cycling — with a 60ms stagger a longer code
 * would run past 900ms, so the per-character step shrinks to fit what is left.
 *
 * prefers-reduced-motion renders the final characters immediately, no cycling.
 */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const STAGGER = 60
const BUDGET = 900

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
}

export default function SplitFlapCode({ code = '', label, className = '' }) {
  const final = String(code).toUpperCase().split('')
  const [shown, setShown] = useState(final)

  useEffect(() => {
    const target = String(code).toUpperCase().split('')

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reduced || target.length === 0) {
      setShown(target)
      return
    }

    setShown(target.map(() => randomGlyph()))

    // Whatever is left of the budget once the last character has started is
    // what that character has to spend on its own cycles.
    const lastStart = (target.length - 1) * STAGGER
    const runway = Math.max(BUDGET - lastStart, 180)

    const timers = []

    target.forEach((finalChar, i) => {
      const cycles = 3 + Math.floor(Math.random() * 4)
      const step = runway / cycles

      for (let c = 1; c <= cycles; c += 1) {
        const isLast = c === cycles
        timers.push(
          setTimeout(
            () =>
              setShown((prev) => {
                const next = [...prev]
                next[i] = isLast ? finalChar : randomGlyph()
                return next
              }),
            i * STAGGER + c * step
          )
        )
      }
    })

    return () => timers.forEach(clearTimeout)
  }, [code])

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* The shuffle is decoration over a value that has to stay readable: the
          live region announces the real code once, while the cells themselves
          stay hidden from assistive tech mid-shuffle. */}
      <span className="sr-only" aria-live="polite">
        Opening code {final.join(' ')}
      </span>

      <div aria-hidden="true" className="flex gap-2">
        {shown.map((char, i) => (
          <span
            key={i}
            className="relative flex h-20 w-16 items-center justify-center overflow-hidden rounded-door border-2 border-ink bg-night font-stencil text-[3.5rem] font-black leading-none text-panel md:h-28 md:w-24 md:text-[4.5rem]"
          >
            {char}
            {/* The hinge line across the middle of every flap. */}
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink" />
          </span>
        ))}
      </div>

      {label && <span className="font-mono text-label uppercase text-steel-600">{label}</span>}
    </div>
  )
}
