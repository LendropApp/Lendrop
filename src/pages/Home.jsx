import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shirt,
  Wrench,
  Camera,
  Bot,
  Music,
  Dumbbell,
  Calendar,
  Key,
  Box,
  Clock,
  ShieldCheck,
  Star,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react'

const INITIAL_LOCKERS = [
  { id: 'A1', item: 'Canon EOS R6 Camera', status: 'available' },
  { id: 'A2', item: 'Bosch Cordless Drill', status: 'rented' },
  { id: 'A3', item: 'DJI Mini 4 Drone', status: 'available' },
  { id: 'B1', item: 'Yamaha Acoustic Guitar', status: 'available' },
  { id: 'B2', item: 'Trek Mountain Bike', status: 'rented' },
  { id: 'B3', item: 'Samsonite 28" Suitcase', status: 'available' },
  { id: 'C1', item: '4-Person Camping Tent', status: 'available' },
  { id: 'C2', item: 'Superhero Costume', status: 'rented' },
  { id: 'C3', item: 'PlayStation 5 Console', status: 'available' },
]

const categories = [
  { id: 'cat-1', name: 'Clothing', icon: Shirt },
  { id: 'cat-2', name: 'Tools', icon: Wrench },
  { id: 'cat-3', name: 'Cameras', icon: Camera },
  { id: 'cat-4', name: 'Drones', icon: Bot },
  { id: 'cat-5', name: 'Instruments', icon: Music },
  { id: 'cat-6', name: 'Sports gear', icon: Dumbbell },
]

const steps = [
  {
    step: 'Step 01',
    title: 'Book & pay',
    desc: 'Pick the item, the dates, and pay from the app. Everything is confirmed instantly.',
    icon: Calendar,
  },
  {
    step: 'Step 02',
    title: 'Type your password',
    desc: 'With your password, open your assigned locker, ready whenever you are.',
    icon: Key,
  },
  {
    step: 'Step 03',
    title: 'Pick up & go',
    desc: 'Type your password, open the locker, and check the item — already verified by our AI.',
    icon: Box,
  },
  {
    step: 'Step 04',
    title: 'Return it',
    desc: 'When you\u2019re done, drop the item back at the same locker. We handle the rest.',
    icon: Clock,
  },
]

const securityFeatures = [
  {
    title: 'AI verification',
    desc: 'Every item is scanned with computer vision before and after the rental, to catch damage and inconsistencies.',
    icon: ShieldCheck,
  },
  {
    title: 'Photo evidence',
    desc: 'We keep photos of the item\u2019s condition at every drop-off and pickup, backing up every transaction.',
    icon: Camera,
  },
  {
    title: 'Verified reputation',
    desc: 'Every profile builds a real reputation based on completed rentals and how well items are cared for.',
    icon: Star,
  },
]

const navLinks = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#categories', label: 'Categories' },
  { href: '#security', label: 'Security' },
]

export default function Home() {
  const navigate = useNavigate()
  const [lockers, setLockers] = useState(INITIAL_LOCKERS)
  const [selectedLocker, setSelectedLocker] = useState(null)
  const [hoveredLocker, setHoveredLocker] = useState(null)
  const [flashLocker, setFlashLocker] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)


  useEffect(() => {
    const interval = setInterval(() => {
      setLockers((prev) => {
        const index = Math.floor(Math.random() * prev.length)
        const next = [...prev]
        next[index] = {
          ...next[index],
          status: next[index].status === 'available' ? 'rented' : 'available',
        }
        setFlashLocker(next[index].id)
        return next
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])


  useEffect(() => {
    if (!flashLocker) return
    const timeout = setTimeout(() => setFlashLocker(null), 700)
    return () => clearTimeout(timeout)
  }, [flashLocker])

  const selectedLockerData = lockers.find((l) => l.id === selectedLocker)
  const hoveredLockerData = lockers.find((l) => l.id === hoveredLocker)
  const displayedLocker = hoveredLockerData ?? selectedLockerData
  const canReserve = selectedLockerData?.status === 'available'

  function handleReserve() {
    if (!canReserve) return
    // Booking requires an account — for now the demo widget routes
    // straight to sign up once an available locker is picked.
    navigate('/signup')
  }

  return (
    <div className="min-h-screen bg-soft-white">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 border-b border-jet-black/5 bg-soft-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <Link to="/" className="flex items-center">
            <img src="/logo-lendrop.png" alt="Lendrop" className="h-7 w-auto" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => ( <a
              
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-jet-black/70 transition hover:text-deep-purple"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-5 md:flex">
            <Link
              to="/become-host"
              className="text-sm font-semibold text-jet-black/70 transition hover:text-deep-purple"
            >
              Become a lender
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold text-jet-black/70 transition hover:text-deep-purple"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-deep-purple px-5 py-2.5 text-sm font-semibold text-soft-white transition hover:bg-deep-purple/90"
            >
              Get started
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="text-jet-black md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-1 border-t border-jet-black/5 px-6 py-4 md:hidden">
            {navLinks.map((link) => (<a
              
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)} 
                className="rounded-lg px-2 py-2.5 text-sm font-medium text-jet-black/70 hover:bg-jet-black/5"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-jet-black/5 pt-3">
              <Link
                to="/login"
                className="rounded-lg px-2 py-2.5 text-sm font-semibold text-jet-black/70 hover:bg-jet-black/5"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-deep-purple px-5 py-2.5 text-center text-sm font-semibold text-soft-white"
              >
                Get started
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:px-10 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-lavender/30 bg-lavender/10 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-deep-purple">
            <span className="h-1.5 w-1.5 rounded-full bg-lavender" />
            Own Nothing. Miss Nothing &middot; El Salvador
          </span>

          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-jet-black sm:text-6xl">
            Rent what you
            <br />
            need.
            <br />
            <span className="text-deep-purple">Without coordinating</span>
            <br />
            with anyone.
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-jet-black/60">
            Cameras, tools, drones, bikes, and more. Reserve, pay, and pick them up
            from a smart locker near you — no messages, no waiting, no strangers.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-deep-purple px-6 py-3 text-sm font-semibold text-soft-white transition hover:bg-deep-purple/90"
            >
              Explore items
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full border border-jet-black/15 px-6 py-3 text-sm font-semibold text-jet-black transition hover:bg-jet-black/5"
            >
              How it works
            </a>
          </div>

          <div className="mt-10 flex items-center gap-8">
            <div>
              <p className="font-display text-2xl font-bold text-jet-black">24/7</p>
              <p className="text-xs font-medium uppercase tracking-wide text-jet-black/45">Access</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-jet-black">100%</p>
              <p className="text-xs font-medium uppercase tracking-wide text-jet-black/45">Secure</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-jet-black">5K+</p>
              <p className="text-xs font-medium uppercase tracking-wide text-jet-black/45">Items</p>
            </div>
          </div>
        </div>

        {/* ================= TERMINAL WIDGET ================= */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-jet-black p-5 shadow-2xl shadow-deep-purple/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="font-mono text-xs font-semibold tracking-wide text-emerald-400">
                  ONLINE
                </span>
              </div>
              <span className="locker-code text-[10px] text-white/40">TERMINAL LD-14</span>
            </div>

            <div className="my-4">
              <p className="locker-code text-sm font-semibold tracking-wide text-white">
                TERMINAL LD-14
              </p>
              <p className="mt-1 text-xs text-white/40">Downtown San Salvador</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {lockers.map((locker) => {
                const isSelected = selectedLocker === locker.id
                const isHovered = hoveredLocker === locker.id
                const isFlashing = flashLocker === locker.id
                const isAvailable = locker.status === 'available'

                return (
                  <button
                    key={locker.id}
                    type="button"
                    onClick={() => setSelectedLocker(locker.id)}
                    onMouseEnter={() => setHoveredLocker(locker.id)}
                    onMouseLeave={() => setHoveredLocker(null)}
                    className={`flex min-h-21 flex-col items-start justify-between rounded-xl border p-3 text-left transition ${
                      isSelected || isHovered
                        ? 'border-lavender bg-lavender/15'
                        : 'border-white/10 bg-white/5 hover:border-lavender/50 hover:bg-lavender/10'
                    } ${isFlashing ? 'ring-2 ring-lavender' : ''}`}
                  >
                    <span className="locker-code text-lg font-bold text-white">{locker.id}</span>
                    <span
                      className={`font-mono text-[9px] uppercase tracking-wide ${
                        isAvailable ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {isAvailable ? 'Available' : 'Rented'}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                  {displayedLocker ? (hoveredLocker ? 'Locker' : 'Selected') : 'Select a locker'}
                </p>
                {displayedLocker ? (
                  <>
                    <p className="locker-code text-sm text-white/85">{displayedLocker.item}</p>
                    <p className="mt-0.5 text-[10px] text-lavender">
                      TERMINAL LD-14 · {displayedLocker.id} · Downtown San Salvador
                    </p>
                  </>
                ) : (
                  <p className="locker-code text-sm text-white/85">above</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleReserve}
                disabled={!canReserve}
                className="rounded-full bg-lavender px-5 py-2.5 text-sm font-semibold text-deep-purple transition hover:bg-lavender/90 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Reserve
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ================= CATEGORIES ================= */}
      <section id="categories" className="border-t border-jet-black/5 bg-white px-6 py-20 sm:px-10 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-lavender">
              What you can rent
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-jet-black sm:text-4xl">
              One locker, hundreds of possibilities.
            </h2>
            <p className="mt-3 text-jet-black/60">
              From a camera for the weekend to the perfect costume for tonight.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <Link
                  key={category.id}
                  to="/signup"
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-jet-black/10 bg-white px-3 py-7 text-center transition hover:-translate-y-0.5 hover:border-lavender hover:shadow-md"
                >
                  <Icon className="h-6 w-6 text-deep-purple" />
                  <span className="text-xs font-semibold text-jet-black">{category.name}</span>
                </Link>
              )
            })}

            <Link
              to="/signup"
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-deep-purple px-3 py-7 text-center text-xs font-semibold text-soft-white transition hover:bg-deep-purple/90"
            >
              View full
              <br />
              catalog
              <ArrowRight className="mt-1 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* ================= HOW IT WORKS ================= */}
        <div id="how-it-works" className="mx-auto mt-24 max-w-6xl">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-lavender">
            How it works
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-jet-black sm:text-4xl">
            Four steps, zero friction.
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.step}
                  className="flex flex-col gap-3 rounded-2xl border border-jet-black/10 bg-white p-6"
                >
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-lavender">
                    {step.step}
                  </span>
                  <Icon className="h-6 w-6 text-deep-purple" />
                  <h3 className="font-display text-base font-semibold text-jet-black">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-jet-black/60">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ================= SECURITY ================= */}
      <section id="security" className="bg-deep-purple px-6 py-20 text-soft-white sm:px-10 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-lavender">
              Security first
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Trust, verified at every step.
            </h2>
            <p className="mt-3 text-soft-white/70">
              Renting between strangers only works if both sides can trust each other.
              So we automated it.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {securityFeatures.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-jet-black/30 p-6"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-lavender/15">
                    <Icon className="h-5 w-5 text-lavender" />
                  </div>
                  <h3 className="font-display text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-soft-white/60">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="border-t border-jet-black/5 bg-soft-white px-6 py-16 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 sm:flex-row">
          <div className="text-center sm:text-left">
            <h2 className="font-display text-2xl font-bold tracking-tight text-jet-black sm:text-3xl">
              Your next locker is closer than you think.
            </h2>
            <p className="mt-2 text-jet-black/60">
              Join the safest rental network in El Salvador.
            </p>
          </div>
          <Link
            to="/signup"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-deep-purple px-6 py-3 text-sm font-semibold text-soft-white transition hover:bg-deep-purple/90"
          >
            Get started now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-jet-black/5 bg-white px-6 py-10 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <img src="/logo-lendrop.png" alt="Lendrop" className="h-5 w-auto opacity-70" />
          <p className="text-xs text-jet-black/40">&copy; 2026 Lendrop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
