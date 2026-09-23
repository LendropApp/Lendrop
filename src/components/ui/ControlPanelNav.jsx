import { Compass, MapPin, Package, Plus, UserCircle2 } from 'lucide-react'

/**
 * ControlPanelNav — DESIGN.md sec. 7.10. The mobile bottom bar as a locker
 * keypad: `night` plate, five equal cells, Publish raised in the middle.
 *
 * Presentational only. It renders whatever `items` it is given and reports
 * clicks through `onSelect` / each item's `onClick`; it owns no routing and no
 * verification rules. Wiring it up is Phase 3's job.
 *
 * NOTE — unresolved conflict: sec. 5 and sec. 7.10 specify five cells, but the
 * shipped MobileBottomNav is deliberately two (Publish + Profile), with
 * everything else in the side drawer. Changing that is navigation, not skin, so
 * this component exists per the spec and nothing mounts it yet.
 *
 * Props:
 *   items     [{ key, label, icon, raised?, onClick?, href? }] — defaults to the
 *             five from sec. 7.10
 *   activeKey which item is current
 *   as        component for items carrying `href` (e.g. react-router NavLink)
 *   onSelect  (key, item) => void
 */
export const DEFAULT_CELLS = [
  { key: 'explore', label: 'Explore', icon: Compass },
  { key: 'map', label: 'Map', icon: MapPin },
  { key: 'publish', label: 'Publish', icon: Plus, raised: true },
  { key: 'locker', label: 'My locker', icon: Package },
  { key: 'profile', label: 'Profile', icon: UserCircle2 },
]

export default function ControlPanelNav({
  items = DEFAULT_CELLS,
  activeKey,
  as: Tag = 'button',
  onSelect,
  className = '',
}) {
  return (
    <nav
      aria-label="Primary"
      className={`border-t-[3px] border-ink bg-night pb-[env(safe-area-inset-bottom)] ${className}`}
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.key === activeKey
          const Element = item.href ? Tag : 'button'

          return (
            <li key={item.key} className="flex">
              <Element
                type={Element === 'button' ? 'button' : undefined}
                href={item.href}
                to={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  item.onClick?.()
                  onSelect?.(item.key, item)
                }}
                className={
                  item.raised
                    ? // The physical-action cell: signal fill, and it stands 8px
                      // proud of the plate (sec. 7.10) so the thumb finds it
                      // without looking.
                      'relative -mt-2 flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-door border-2 border-ink bg-signal px-1 text-ink press-sm'
                    : `relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
                        active ? 'text-lilac' : 'text-panel/70 hover:text-panel'
                      }`
                }
              >
                {/* Lit LED over the active cell (sec. 7.10). The aria-current
                    above is what actually conveys this, so the dot is decor. */}
                {active && !item.raised && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 size-1.5 rounded-full bg-lilac ring-3 ring-lilac/35"
                  />
                )}

                <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
                <span className="text-label font-mono uppercase leading-none">{item.label}</span>
              </Element>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
