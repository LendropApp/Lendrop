import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Menu, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { getCategoryIcon } from '../lib/categoryIcons'
import Logo from '../components/Logo'
import RentalStatus from '../components/RentalStatus'
import Shutter from '../components/Shutter'

// Illustrative only: the compartment in the hero and the locker log below
// are sample data, and both are labelled as such on the page.
const SAMPLE_LISTING = {
  code: 'B4',
  item: 'Canon EOS R6',
  price: 18,
  location: 'Downtown San Salvador',
  pin: '482 913',
  image:
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
}

const SAMPLE_LOG = [
  { time: 'Oct 4 · 09:12', who: 'Owner', event: 'Item deposited, photo attached' },
  { time: 'Oct 4 · 18:40', who: 'Renter', event: 'Item retrieved with PIN' },
  { time: 'Oct 7 · 17:05', who: 'Renter', event: 'Return deposited, photo attached' },
  { time: 'Oct 7 · 19:30', who: 'Owner', event: 'Return retrieved' },
]

const HANDOFF_STEPS = [
  {
    title: 'Reserve and pay',
    desc: 'Pick your dates and pay online. The rental is confirmed once the payment clears.',
    status: 'confirmed',
  },
  {
    title: 'The owner drops it off',
    desc: 'They open an assigned compartment, photograph the item and close the door.',
  },
  {
    title: 'You pick it up',
    desc: 'Your PIN opens the compartment. The drop-off photo shows the condition it was left in.',
    status: 'active',
  },
  {
    title: 'You bring it back',
    desc: 'Same locker, a new photo, door closed. No need to find the owner.',
  },
  {
    title: 'Deposit released',
    desc: 'Once the return is checked, the deposit is released and you review each other.',
    status: 'completed',
  },
]

const TRUST_FACTS = [
  {
    title: 'Identity tied to a DUI',
    desc: 'Hosts verify their Salvadoran national ID before they can list anything.',
  },
  {
    title: 'Photos at both ends',
    desc: 'The item is photographed when it goes into the locker and when it comes back.',
  },
  {
    title: 'Every door opening logged',
    desc: 'Who opened which compartment, and when, is recorded for every rental.',
  },
]

const navLinks = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#hosting', label: 'Hosting' },
  { href: '#trust', label: 'Trust' },
]

function Checklist({ items }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((text) => (
        <li key={text} className="flex gap-3 text-sm text-text">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState([])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => {
        if (!cancelled) setCategories(data ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleSearch(event) {
    event.preventDefault()
    const q = query.trim()
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore')
  }

  return (
    <div className="min-h-dvh bg-bg">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <Link to="/" aria-label="Lendrop home">
            <Logo />
          </Link>

          <nav aria-label="Sections" className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-text-muted hover:text-primary">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <Link to="/login" className="cta-outline rounded-xl px-5 py-2 text-sm font-semibold">
              Log in
            </Link>
            <Link to="/signup" className="cta-brand rounded-xl px-5 py-2.5 text-sm font-semibold text-soft-white">
              Sign up
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg p-1 text-text md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-1 border-t border-border px-6 py-4 md:hidden">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm font-medium text-text-muted hover:bg-surface-raised"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <Link to="/login" className="cta-outline rounded-xl px-5 py-2 text-center text-sm font-semibold">
                Log in
              </Link>
              <Link to="/signup" className="cta-brand rounded-xl px-5 py-2.5 text-center text-sm font-semibold text-soft-white">
                Sign up
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ================= HERO: the shutter ================= */}
        <section className="shutter">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-10 pt-14 sm:px-10 lg:grid-cols-12 lg:gap-12 lg:pb-14 lg:pt-20">
            <div className="lg:col-span-7">
              <h1 className="text-5xl font-extrabold leading-[0.98] text-soft-white sm:text-7xl lg:text-8xl">
                Rent it. Skip the meetup.
              </h1>
              <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-brand-surface-muted">
                Borrow cameras, tools, bikes and more from people in El Salvador. The owner leaves it
                in a locker and you pick it up with a PIN. You never have to meet.
              </p>
            </div>

            {/* The compartment: a door in the shutter that rolls up once. */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/15 bg-jet-black/35 p-2">
                <Shutter label={`Compartment ${SAMPLE_LISTING.code}`} className="rounded-xl">
                  <figure className="overflow-hidden rounded-xl bg-surface text-text">
                    <img
                      src={SAMPLE_LISTING.image}
                      alt={SAMPLE_LISTING.item}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <figcaption className="flex items-end justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <p className="locker-code text-xs text-text-muted">
                          {SAMPLE_LISTING.code} · {SAMPLE_LISTING.location}
                        </p>
                        <p className="mt-1 truncate text-lg font-bold">{SAMPLE_LISTING.item}</p>
                        <RentalStatus status="confirmed" className="mt-2" />
                      </div>
                      <div className="text-right">
                        <p className="num text-3xl">${SAMPLE_LISTING.price}</p>
                        <p className="text-xs text-text-muted">per day</p>
                      </div>
                    </figcaption>
                  </figure>
                </Shutter>
              </div>
              <p className="mt-2 text-xs text-brand-surface-muted">Sample listing.</p>
            </div>
          </div>

          {/* Bottom rail of the shutter: where you start. */}
          <div className="border-t border-white/10 bg-jet-black/30">
            <form
              onSubmit={handleSearch}
              role="search"
              className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:px-10"
            >
              <label htmlFor="hero-search" className="sr-only">
                What do you need?
              </label>
              <div className="flex flex-1 items-center gap-3 rounded-xl bg-soft-white px-4 text-jet-black">
                <Search className="h-5 w-5 shrink-0 text-deep-purple" aria-hidden="true" />
                <input
                  id="hero-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search cameras, drills, tents…"
                  className="w-full bg-transparent py-3.5 text-base text-jet-black outline-none placeholder:text-[#5d5a6b]"
                />
              </div>
              <button type="submit" className="cta-brand rounded-xl px-6 py-3.5 text-sm font-bold text-soft-white ring-1 ring-white/30">
                Search
              </button>
              <Link
                to="/become-host"
                className="text-sm font-semibold text-soft-white underline decoration-white/40 hover:decoration-white sm:ml-4"
              >
                Have something to lend?
              </Link>
            </form>
          </div>
        </section>

        {/* ================= RENT / HOST ================= */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl md:grid-cols-2">
            <div className="px-6 py-16 sm:px-10 lg:py-20">
              <h2 className="text-3xl font-extrabold sm:text-4xl">Need it for a few days?</h2>
              <p className="mt-4 max-w-[48ch] text-text-muted">
                Reserve the dates, pay online, and collect it from a locker when it suits you.
              </p>
              <Checklist
                items={[
                  'Pay by card online, before anything changes hands',
                  'Get your pickup PIN once the owner drops it off',
                  'Return it to the same locker when you are done',
                ]}
              />
              <Link to="/explore" className="cta-brand mt-8 inline-block rounded-xl px-6 py-3 text-sm font-semibold text-soft-white">
                Browse items
              </Link>
            </div>

            <div id="hosting" className="scroll-mt-20 border-t border-border px-6 py-16 sm:px-10 md:border-l md:border-t-0 lg:py-20">
              <h2 className="text-3xl font-extrabold sm:text-4xl">Own it? Let it earn.</h2>
              <p className="mt-4 max-w-[48ch] text-text-muted">
                List what sits unused. Drop it at a locker once the rental is paid, and pick it up
                again when it comes back.
              </p>
              <Checklist
                items={[
                  'A suggested daily price, based on similar items',
                  'A size check that your item fits a locker before you list it',
                  'A deposit held until the item is returned',
                ]}
              />
              <Link
                to="/become-host"
                className="cta-outline mt-8 inline-block rounded-xl px-6 py-2.5 text-sm font-semibold"
              >
                Start hosting
              </Link>
            </div>
          </div>
        </section>

        {/* ================= HOW A HANDOFF WORKS ================= */}
        <section id="how-it-works" className="scroll-mt-20 px-6 py-20 sm:px-10 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-[16ch] text-3xl font-extrabold sm:text-5xl">How a handoff works</h2>

            <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
              {HANDOFF_STEPS.map((step, index) => (
                <li key={step.title} className="flex flex-col bg-surface p-6">
                  <span className="num text-4xl text-primary" aria-hidden="true">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-base font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{step.desc}</p>
                  {step.status && <RentalStatus status={step.status} className="mt-auto pt-5" />}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ================= TRUST ================= */}
        <section id="trust" className="scroll-mt-20 border-t border-border bg-surface px-6 py-20 sm:px-10 lg:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="text-3xl font-extrabold sm:text-5xl">Every handoff leaves a record.</h2>
              <dl className="mt-10 space-y-6">
                {TRUST_FACTS.map((fact) => (
                  <div key={fact.title}>
                    <dt className="font-bold">{fact.title}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-text-muted">{fact.desc}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <figure className="self-start rounded-2xl border border-border bg-bg lg:col-span-7">
              <figcaption className="flex items-center justify-between border-b border-border px-5 py-4">
                <span className="font-bold">
                  Locker log <span className="locker-code font-normal text-text-muted">· B4</span>
                </span>
                <span className="text-xs text-text-muted">Sample data</span>
              </figcaption>
              <table className="w-full text-left text-sm">
                <thead className="sr-only">
                  <tr>
                    <th>Time</th>
                    <th>Opened by</th>
                    <th>Event</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_LOG.map((row) => (
                    <tr key={row.time} className="border-b border-border last:border-0">
                      <td className="locker-code whitespace-nowrap px-5 py-4 align-top text-xs text-text-muted">{row.time}</td>
                      <td className="px-2 py-4 align-top font-semibold">{row.who}</td>
                      <td className="px-5 py-4 align-top text-text-muted">{row.event}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </figure>
          </div>
        </section>

        {/* ================= CATEGORIES ================= */}
        <section id="categories" className="scroll-mt-20 border-t border-border px-6 py-20 sm:px-10">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-extrabold sm:text-4xl">What people lend</h2>
            {categories.length > 0 ? (
              <ul className="mt-8 flex flex-wrap gap-2">
                {categories.map((category) => {
                  const Icon = getCategoryIcon(category.slug)
                  return (
                    <li key={category.id}>
                      <Link
                        to={`/explore?category=${encodeURIComponent(category.slug)}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary"
                      >
                        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                        {category.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-6 text-text-muted">
                <Link to="/explore" className="font-semibold text-primary underline">
                  Browse everything available
                </Link>
              </p>
            )}
          </div>
        </section>

        {/* ================= CLOSE ================= */}
        <section className="shutter px-6 py-16 sm:px-10 lg:py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="max-w-[18ch] text-4xl font-extrabold text-soft-white sm:text-6xl">
              Find it. Reserve it. Pick it up.
            </h2>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                to="/explore"
                className="cta-outline rounded-xl px-6 py-2.5 text-sm font-bold"
              >
                Browse items
              </Link>
              <Link
                to="/become-host"
                className="rounded-xl border border-white/40 px-6 py-3 text-sm font-bold text-soft-white hover:border-white"
              >
                Start hosting
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface px-6 py-10 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo className="h-5" />
          <nav aria-label="Footer" className="flex gap-6 text-sm text-text-muted">
            <Link to="/explore" className="hover:text-primary">Explore</Link>
            <Link to="/become-host" className="hover:text-primary">Become a host</Link>
            <Link to="/login" className="hover:text-primary">Log in</Link>
          </nav>
          <p className="text-xs text-text-muted">&copy; 2026 Lendrop</p>
        </div>
      </footer>
    </div>
  )
}
