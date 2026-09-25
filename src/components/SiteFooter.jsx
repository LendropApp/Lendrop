import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import Logo from './Logo'
import BuiltWithClaude from './BuiltWithClaude'

export const SUPPORT_EMAIL = 'lendrop2026@gmail.com'

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { to: '/explore', label: 'Browse items' },
      { to: '/categories', label: 'Categories' },
      { to: '/#how-it-works', label: 'How it works' },
    ],
  },
  {
    title: 'Hosting',
    links: [
      { to: '/become-host', label: 'Become a host' },
      { to: '/help#hosting', label: 'Hosting FAQ' },
      { to: '/help#payments', label: 'Fees & payouts' },
    ],
  },
  {
    title: 'Support',
    links: [
      { to: '/help', label: 'Help center' },
      { to: '/help#lockers', label: 'Lockers & Lendrop ID' },
      { to: '/help#contact', label: 'Contact us' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/terms', label: 'Terms of Service' },
      { to: '/privacy', label: 'Privacy Policy' },
    ],
  },
]

// The one footer for every page that has one (landing, Explore, Help, the
// legal pages), so links and the contact address can't drift apart.
export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]">
          <div>
            <Link to="/" aria-label="Lendrop home">
              <Logo />
            </Link>
            <p className="mt-3 max-w-[30ch] text-sm leading-relaxed text-text-muted">
              Rent what you need from people in El Salvador. Handed off through lockers, never in
              person.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {SUPPORT_EMAIL}
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:col-span-4">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="text-sm font-bold text-text">{column.title}</p>
                <ul className="mt-3 space-y-2 text-sm text-text-muted">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.to} className="hover:text-primary">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 border-t border-border pt-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Lendrop · San Salvador, El Salvador</span>
          <BuiltWithClaude />
        </div>
      </div>
    </footer>
  )
}
