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
  {
    id: 'A1',
    item: 'Canon EOS R6 Camera',
    shortName: 'EOS R6',
    status: 'available',
    location: 'Downtown San Salvador',
    image:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'A2',
    item: 'Bosch Cordless Drill',
    shortName: 'Cordless Drill',
    status: 'rented',
    location: 'Downtown San Salvador',
    image:
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'A3',
    item: 'DJI Mini 4 Drone',
    shortName: 'Mini 4 Drone',
    status: 'available',
    location: 'Downtown San Salvador',
    image:
      'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'B1',
    item: 'Yamaha Acoustic Guitar',
    shortName: 'Acoustic Guitar',
    status: 'available',
    location: 'Downtown San Salvador',
    image:
      'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'B2',
    item: 'Trek Mountain Bike',
    shortName: 'Mountain Bike',
    status: 'rented',
    location: 'Downtown San Salvador',
    image:
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'B3',
    item: 'Samsonite 28" Suitcase',
    shortName: 'Suitcase',
    status: 'available',
    location: 'Downtown San Salvador',
    image:
      'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'C1',
    item: '4-Person Camping Tent',
    shortName: 'Camping Tent',
    status: 'available',
    location: 'Downtown San Salvador',
    image:
      'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'C2',
    item: 'Gaming Console',
    shortName: 'Gaming Console',
    status: 'rented',
    location: 'Downtown San Salvador',
    image:
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'C3',
    item: 'PlayStation 5 Console',
    shortName: 'PlayStation 5',
    status: 'available',
    location: 'Downtown San Salvador',
    image:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=500&q=80',
  },
];
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
    desc: 'Type your password, open the locker, and check the item. Already verified by our AI.',
    icon: Box,
  },
  {
    step: 'Step 04',
    title: 'Return it',
    desc: 'When you’re done, drop the item back at the same locker. We handle the rest.',
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
    desc: 'We keep photos of the item’s condition at every drop off and pickup, backing up every transaction.',
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
          status:
            next[index].status === 'available'
              ? 'rented'
              : 'available',
        }

        setFlashLocker(next[index].id)

        return next
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!flashLocker) return

    const timeout = setTimeout(() => {
      setFlashLocker(null)
    }, 700)

    return () => clearTimeout(timeout)
  }, [flashLocker])

  const selectedLockerData = lockers.find(
    (locker) => locker.id === selectedLocker
  )

  const hoveredLockerData = lockers.find(
    (locker) => locker.id === hoveredLocker
  )

  const displayedLocker =
    hoveredLockerData ?? selectedLockerData

  const canReserve =
    displayedLocker?.status === 'available'

  function handleReserve() {
    if (!canReserve) return
    navigate('/signup')
  }

  return (
    <div className="min-h-screen bg-soft-white">

      {/* ================= HEADER ================= */}

      <header className="sticky top-0 z-50 border-b border-jet-black/5 bg-soft-white/80 backdrop-blur">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">

          <Link to="/" className="flex items-center">
            <img
              src="/logo-lendrop.png"
              alt="Lendrop"
              className="h-7 w-auto"
            />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">

            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-jet-black/70 transition hover:text-deep-purple"
              >
                {link.label}
              </a>
            ))}

          </nav>

          <div className="hidden items-center gap-3 md:flex">

            <Link
              to="/login"
              className="text-sm font-semibold text-jet-black/70 transition hover:text-deep-purple"
            >
              Log in
            </Link>

            <Link
              to="/signup"
              className="rounded-full bg-linear-to-r from-deep-purple to-lavender px-5 py-2.5 text-sm font-semibold text-soft-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:brightness-105"
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
            {menuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

        </div>

        {menuOpen && (
          <div className="flex flex-col gap-1 border-t border-jet-black/5 px-6 py-4 md:hidden">

            {navLinks.map((link) => (
              <a
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
                className="rounded-full bg-linear-to-r from-deep-purple to-lavender px-5 py-2.5 text-center text-sm font-semibold text-soft-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)]"
              >
                Get started
              </Link>

            </div>
          </div>
        )}

      </header>

      {/* ================= HERO ================= */}

      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:px-10 lg:grid-cols-2 lg:items-start lg:py-24">

        <div className="pt-5 lg:pt-5">

          <span className="inline-flex items-center gap-2 rounded-full border border-lavender/30 bg-lavender/10 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-deep-purple">

            <span className="h-1.5 w-1.5 rounded-full bg-lavender" />

            Own Nothing. Miss Nothing · El Salvador

          </span>

          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-jet-black sm:text-6xl">

            Rent what you
            <br />
            need.
            <br />

            <span className="text-deep-purple">
              Without coordinating
            </span>

            <br />

            with anyone.

          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-jet-black/60">
            Cameras, tools, drones, bikes, and more. Reserve, pay, and pick
            them up from a smart locker near you. No messages, no waiting,
            no strangers.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">

            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-deep-purple to-lavender px-6 py-3 text-sm font-semibold text-soft-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:brightness-105"
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
              <p className="font-display text-2xl font-bold text-jet-black">
                24/7
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-jet-black/45">
                Access
              </p>
            </div>

            <div>
              <p className="font-display text-2xl font-bold text-jet-black">
                100%
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-jet-black/45">
                Secure
              </p>
            </div>

            <div>
              <p className="font-display text-2xl font-bold text-jet-black">
                5K+
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-jet-black/45">
                Items
              </p>
            </div>

          </div>

        </div>

        {/* ================= SMART LOCKER ================= */}

        <div className="flex justify-center lg:justify-end">

          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-lavender/25 bg-white p-5 shadow-2xl shadow-lavender/20">

            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-lavender/60 to-transparent" />

            {/* TERMINAL HEADER */}

            <div className="flex items-center justify-between border-b border-lavender/25 pb-4">

              <div className="flex items-center gap-2.5">

                <span className="relative flex h-2.5 w-2.5">

                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />

                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />

                </span>

                <div>

                  <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-deep-purple">
                    SYSTEM ONLINE
                  </p>

                  <p className="mt-0.5 text-[9px] text-jet-black/45">
                    SMART LOCKER NETWORK
                  </p>

                </div>

              </div>

              <span className="rounded-md border border-lavender/25 bg-white px-2 py-1 font-mono text-[9px] font-semibold text-deep-purple shadow-sm">
                LD-14
              </span>

            </div>

            {/* LOCATION */}

            <div className="my-4 flex items-end justify-between">

              <div>

                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-deep-purple">
                  Available nearby
                </p>

                <p className="mt-1 font-display text-base font-semibold text-jet-black">
                  Downtown San Salvador
                </p>

              </div>

              <span className="font-mono text-[9px] font-medium text-jet-black/40">
                09 ITEMS
              </span>

            </div>

            {/* LOCKER GRID */}

            <div className="grid grid-cols-3 gap-2.5">

              {lockers.map((locker) => {

                const isSelected =
                  selectedLocker === locker.id

                const isHovered =
                  hoveredLocker === locker.id

                const isActive =
                  isSelected || isHovered

                const isFlashing =
                  flashLocker === locker.id

                const isAvailable =
                  locker.status === 'available'

                return (
                  <button
                    key={locker.id}
                    type="button"
                    onClick={() =>
                      setSelectedLocker(locker.id)
                    }
                    onMouseEnter={() =>
                      setHoveredLocker(locker.id)
                    }
                    onMouseLeave={() =>
                      setHoveredLocker(null)
                    }
                    className={`group relative overflow-hidden rounded-xl border p-2 text-left transition-all duration-300 ${
                      isActive
                        ? 'border-deep-purple bg-lavender/15 shadow-[0_8px_25px_-10px_rgba(165,140,244,0.55)]'
                        : 'border-lavender/25 bg-white hover:border-lavender hover:bg-lavender/5'
                    } ${
                      isFlashing
                        ? 'ring-2 ring-lavender/50'
                        : ''
                    }`}
                  >

                    <div className="mb-1.5 flex items-center justify-between">

                      <span
                        className={`font-mono text-[9px] font-bold tracking-widest ${
                          isActive
                            ? 'text-deep-purple'
                            : 'text-jet-black/45'
                        }`}
                      >
                        {locker.id}
                      </span>

                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isAvailable
                            ? 'bg-emerald-400'
                            : 'bg-jet-black/20'
                        }`}
                      />

                    </div>

                    <div className="relative aspect-[1.15] overflow-hidden rounded-lg border border-lavender/25 bg-lavender/15">

                      <img
                        src={locker.image}
                        alt={locker.item}
                        className={`h-full w-full object-cover transition duration-500 ${
                          isActive
                            ? 'scale-105 opacity-100'
                            : 'opacity-85 group-hover:scale-105 group-hover:opacity-100'
                        } ${
                          !isAvailable
                            ? 'grayscale opacity-40'
                            : ''
                        }`}
                      />

                      <div className="absolute inset-0 bg-linear-to-t from-jet-black/35 via-transparent to-transparent" />

                      {!isAvailable && (
                        <div className="absolute inset-0 flex items-center justify-center">

                          <span className="rounded-full border border-white/60 bg-jet-black/75 px-2 py-1 font-mono text-[7px] uppercase tracking-wider text-white backdrop-blur">
                            Rented
                          </span>

                        </div>
                      )}

                    </div>

                    <div className="mt-2">

                      <p
                        className={`truncate text-[10px] font-semibold ${
                          isActive
                            ? 'text-deep-purple'
                            : 'text-jet-black/70'
                        }`}
                      >
                        {locker.shortName}
                      </p>

                      <p
                        className={`mt-0.5 font-mono text-[8px] uppercase tracking-wide ${
                          isAvailable
                            ? 'text-emerald-500'
                            : 'text-jet-black/40'
                        }`}
                      >
                        {isAvailable
                          ? 'Available'
                          : 'Rented'}
                      </p>

                    </div>

                    <div
                      className={`absolute right-1 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full transition ${
                        isActive
                          ? 'bg-deep-purple shadow-[0_0_8px_rgba(165,140,244,0.55)]'
                          : 'bg-lavender/25'
                      }`}
                    />

                  </button>
                )
              })}

            </div>

            {/* PREVIEW */}

            <div className="mt-4 overflow-hidden rounded-2xl border border-lavender/25 bg-white shadow-sm">

              {displayedLocker ? (

                <div className="flex min-h-[150px]">

                  <div className="relative w-[42%] shrink-0 overflow-hidden bg-lavender/15">

                    <img
                      src={displayedLocker.image}
                      alt={displayedLocker.item}
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute inset-0 bg-linear-to-r from-transparent to-white/80" />

                    <span className="absolute left-2.5 top-2.5 rounded-md border border-white/70 bg-white/90 px-2 py-1 font-mono text-[8px] font-bold tracking-widest text-deep-purple shadow-sm">
                      {displayedLocker.id}
                    </span>

                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5">

                    <div>

                      <div className="flex items-center justify-between gap-2">

                        <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-deep-purple">
                          Item preview
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 font-mono text-[7px] uppercase tracking-wide ${
                            displayedLocker.status ===
                            'available'
                              ? 'bg-lavender/15 text-deep-purple'
                              : 'bg-jet-black/10 text-jet-black/50'
                          }`}
                        >
                          {displayedLocker.status}
                        </span>

                      </div>

                      <h3 className="mt-2 line-clamp-2 font-display text-sm font-semibold leading-snug text-jet-black">
                        {displayedLocker.item}
                      </h3>

                      <p className="mt-2 text-[9px] leading-relaxed text-jet-black/45">
                        Smart locker {displayedLocker.id}
                      </p>

                      <p className="mt-0.5 text-[9px] text-jet-black/40">
                        {displayedLocker.location}
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={handleReserve}
                      disabled={
                        displayedLocker.status !==
                        'available'
                      }
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-deep-purple to-lavender px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-none disabled:bg-jet-black/10 disabled:text-jet-black/30 disabled:shadow-none"
                    >
                      {displayedLocker.status ===
                      'available'
                        ? 'Reserve item'
                        : 'Currently rented'}

                      {displayedLocker.status ===
                        'available' && (
                        <ArrowRight className="h-3 w-3" />
                      )}
                    </button>

                  </div>

                </div>

              ) : (

                <div className="flex min-h-[150px] items-center justify-center p-8 text-center">

                  <div>

                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-lavender/25 bg-lavender/15">

                      <Box className="h-4 w-4 text-lavender" />

                    </div>

                    <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.15em] text-jet-black/45">
                      Select a compartment
                    </p>

                    <p className="mt-1 text-[9px] text-jet-black/35">
                      Hover or tap an item to preview
                    </p>

                  </div>

                </div>

              )}

            </div>

            {/* TERMINAL FOOTER */}

            <div className="mt-3 flex items-center justify-between font-mono text-[8px] uppercase tracking-wider text-jet-black/40">

              <span>Secure access</span>

              <span className="text-deep-purple">
                AI verified
              </span>

              <span>24/7 pickup</span>

            </div>

          </div>

        </div>

      </main>

      {/* ================= CATEGORIES ================= */}

      <section
        id="categories"
        className="border-t border-jet-black/5 bg-white px-6 py-20 sm:px-10 lg:py-28"
      >

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

                  <span className="text-xs font-semibold text-jet-black">
                    {category.name}
                  </span>

                </Link>
              )
            })}

            <Link
              to="/signup"
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-linear-to-r from-deep-purple to-lavender px-3 py-7 text-center text-xs font-semibold text-soft-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:brightness-105"
            >
              View full
              <br />
              catalog
              <ArrowRight className="mt-1 h-4 w-4" />
            </Link>

          </div>

        </div>

        {/* ================= HOW IT WORKS ================= */}

        <div
          id="how-it-works"
          className="mx-auto mt-24 max-w-6xl"
        >

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

                  <p className="text-sm leading-relaxed text-jet-black/60">
                    {step.desc}
                  </p>

                </div>
              )
            })}

          </div>

        </div>

      </section>

      {/* ================= SECURITY ================= */}

      <section
        id="security"
        className="bg-deep-purple px-6 py-20 text-soft-white sm:px-10 lg:py-28"
      >

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

                  <h3 className="font-display text-base font-semibold">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-soft-white/60">
                    {feature.desc}
                  </p>

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
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-linear-to-r from-deep-purple to-lavender px-6 py-3 text-sm font-semibold text-soft-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:brightness-105"
          >
            Get started now
            <ArrowRight className="h-4 w-4" />
          </Link>

        </div>

      </section>

      {/* ================= FOOTER ================= */}

      <footer className="border-t border-jet-black/5 bg-white px-6 py-10 sm:px-10">

        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">

          <img
            src="/logo-lendrop.png"
            alt="Lendrop"
            className="h-5 w-auto opacity-70"
          />

          <p className="text-xs text-jet-black/40">
            &copy; 2026 Lendrop. All rights reserved.
          </p>

        </div>

      </footer>

    </div>
  )
}