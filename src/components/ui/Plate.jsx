/**
 * Plate — the section header from DESIGN.md sec. 5 / 7.6.
 *
 * Title in display-m on the left, a real number in mono `label` on the right,
 * 3px ink rule underneath. The right slot is for a FACT ('12 available today'),
 * not a decorative tagline — the doc is explicit about that.
 *
 * Props:
 *   title    string
 *   meta     string | node — the real datum, right-aligned
 *   as       heading level (default 'h2'); pick by document order, not by size
 *   actions  node rendered under the rule, e.g. filter chips
 */
export default function Plate({ title, meta, as: Tag = 'h2', actions, className = '' }) {
  return (
    <div className={`border-b-[3px] border-ink pb-2 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Tag className="font-display text-display-m uppercase text-ink">{title}</Tag>
        {meta && <span className="font-mono text-label uppercase text-steel-600">{meta}</span>}
      </div>
      {actions && <div className="mt-3">{actions}</div>}
    </div>
  )
}
