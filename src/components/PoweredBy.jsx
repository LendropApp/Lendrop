import { useState } from 'react'

// Footer credits. The marks are Anthropic's and Google's trademarks, so
// they are loaded from the files in /public (from Wikimedia Commons, see
// the commit that added them) rather than redrawn here. If a file is
// missing, that badge falls back to text only instead of a broken image.
const CREDITS = [
  { name: 'Claude', href: 'https://claude.com', logo: '/claude-logo.svg' },
  { name: 'Gemini', href: 'https://gemini.google.com', logo: '/gemini-logo.svg' },
]

function Badge({ name, href, logo }) {
  const [logoOk, setLogoOk] = useState(true)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted hover:border-primary hover:text-text"
    >
      {logoOk && (
        <img src={logo} alt="" aria-hidden="true" className="h-4 w-4" onError={() => setLogoOk(false)} />
      )}
      Powered by {name}
    </a>
  )
}

export default function PoweredBy({ className = '' }) {
  return (
    <div className={`flex flex-col items-start gap-2 sm:items-end ${className}`}>
      {CREDITS.map((credit) => (
        <Badge key={credit.name} {...credit} />
      ))}
    </div>
  )
}
