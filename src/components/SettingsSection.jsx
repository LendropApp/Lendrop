/**
 * SettingsSection — the card every block on /settings sits in.
 *
 * Props:
 *   title        section heading
 *   description  optional one-liner under it
 *   icon         optional Lucide component shown beside the title
 *   children     the section's controls
 *
 * Renders a <section> labelled by its own heading, so a screen reader can list
 * and jump between the settings blocks instead of hearing one flat page.
 */
export default function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  className = '',
}) {
  return (
    <section
      aria-label={title}
      className={`rounded-2xl border border-border bg-surface p-5 sm:p-6 ${className}`}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-text">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </section>
  )
}
