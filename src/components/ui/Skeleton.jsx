/**
 * Skeleton — DESIGN.md sec. 7.12. Door-shaped placeholders in steel-300 with a
 * slow 1.6s sweep. The global prefers-reduced-motion rule in index.css stops
 * the sweep, as sec. 7.12 requires.
 *
 * Props:
 *   variant  'door' | 'line' | 'block'
 *   count    number of copies (default 1)
 *   className
 *
 * aria-hidden throughout: the loading state is announced once by the region
 * that owns it, not once per placeholder shape.
 */
function Sweep({ className = '' }) {
  return <span className={`anim-sweep block bg-steel-300 ${className}`} />
}

export default function Skeleton({ variant = 'line', count = 1, className = '' }) {
  const items = Array.from({ length: count })

  if (variant === 'door') {
    return (
      <>
        {items.map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className={`overflow-hidden rounded-door border-[3px] border-ink bg-panel shadow-hard-md ${className}`}
          >
            <Sweep className="aspect-[4/3] w-full border-b-2 border-ink" />
            <div className="flex flex-col gap-2 p-3">
              <Sweep className="h-3 w-1/3 rounded-[2px]" />
              <Sweep className="h-4 w-4/5 rounded-[2px]" />
              <Sweep className="h-4 w-1/4 rounded-[2px]" />
            </div>
          </div>
        ))}
      </>
    )
  }

  if (variant === 'block') {
    return (
      <>
        {items.map((_, i) => (
          <Sweep
            key={i}
            className={`rounded-door border-2 border-ink ${className || 'h-24 w-full'}`}
          />
        ))}
      </>
    )
  }

  return (
    <>
      {items.map((_, i) => (
        <Sweep key={i} className={`rounded-[2px] ${className || 'h-4 w-full'}`} />
      ))}
    </>
  )
}
