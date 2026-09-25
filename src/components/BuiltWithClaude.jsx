import { useState } from 'react'

/**
 * Footer credit: the site was designed and built with Claude (Claude Code).
 * The mark is Anthropic's trademark, so it is loaded from the official file
 * at /claude-logo.svg (download it from Anthropic's brand assets) rather
 * than redrawn here. Until that file exists the badge is text only.
 */
export default function BuiltWithClaude({ className = '' }) {
  const [logoOk, setLogoOk] = useState(true)

  return (
    <a
      href="https://claude.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted hover:border-primary hover:text-text ${className}`}
    >
      {logoOk && (
        <img
          src="/claude-logo.svg"
          alt=""
          aria-hidden="true"
          className="h-4 w-4"
          onError={() => setLogoOk(false)}
        />
      )}
      Built with Claude
    </a>
  )
}
