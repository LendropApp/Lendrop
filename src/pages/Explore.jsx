import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Heart,
  Star,
  Box,
  User,
  Shirt,
  Dumbbell,
  Wrench,
  Laptop,
  Package,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'


const CATEGORIES = [
  { id: 'clothing', label: 'Clothing', Icon: Shirt },
  { id: 'sports', label: 'Sports', Icon: Dumbbell },
  { id: 'tools', label: 'Tools', Icon: Wrench },
  { id: 'tech', label: 'Tech', Icon: Laptop },
  { id: 'other', label: 'Other', Icon: Package },
]

const OWNERS = [
  { name: 'M. García', verified: true },
  { name: 'C. Turcios', verified: false },
  { name: 'A. Molina', verified: true },
  { name: 'R. Hernández', verified: false },
  { name: 'D. Alas', verified: true },
  { name: 'L. Portillo', verified: false },
  { name: 'S. Cerón', verified: true },
  { name: 'J. Rivas', verified: false },
]

const RAW_LISTINGS = [
  { title: 'Formal navy suit, size 40', category: 'clothing', price: 0, image: 'photo-1594938298603-c8148c4dae35' },
  { title: 'Red evening gown', category: 'clothing', price: 0, image: 'photo-1595777457583-95e059d581b8' },
  { title: 'Brown leather jacket', category: 'clothing', price: 0, image: 'photo-1591047139829-d91aecb6caea' },
  { title: 'Winter coat, size L', category: 'clothing', price: 0, image: 'photo-1551028719-00167b16eac5' },
  { title: 'Trek mountain bike', category: 'sports', price: 0, image: 'photo-1697423878282-0c4bbc3f821a' },
  { title: 'Full golf set', category: 'sports', price: 0, image: 'photo-1587174486073-ae5e5cff23aa' },
  { title: 'Adjustable dumbbell set', category: 'sports', price: 0, image: 'photo-1603077492579-39ff927823db' },
  { title: 'Tennis racket, pro grade', category: 'sports', price: 0, image: 'photo-1542144582-1ba00456b5e3' },
  { title: 'Cordless drill, Bosch', category: 'tools', price: 0, image: 'photo-1504148455328-c376907d081c' },
  { title: 'Full wrench & socket set', category: 'tools', price: 0, image: 'photo-1530088528371-105e6f3b2336' },
  { title: '6-ft folding ladder', category: 'tools', price: 0, image: 'photo-1549030782-4935f80baeb6' },
  { title: 'Electric circular saw', category: 'tools', price: 0, image: 'photo-1505855796860-aa05646cbf1f' },
  { title: 'Canon EOS R6 camera', category: 'tech', price: 0, image: 'photo-1516035069371-29a1b244cc32' },
  { title: 'Portable HD projector', category: 'tech', price: 0, image: 'photo-1587202372775-e229f172b9d7' },
  { title: 'PlayStation 5, one controller', category: 'tech', price: 0, image: 'photo-1600861194942-f883de0dfe96' },
  { title: 'Noise-cancelling headphones', category: 'tech', price: 0, image: 'photo-1600294037681-c80b4cb5b434' },
  { title: '4-person camping tent', category: 'other', price: 0, image: 'photo-1504851149312-7a075b496cc7' },
  { title: 'Event table & chairs set', category: 'other', price: 0, image: 'photo-1533090161767-e6ffed986c88' },
  { title: 'Portable party speaker', category: 'other', price: 0, image: 'photo-1517457373958-b7bdd4587205' },
  { title: 'Superhero costume, adult M', category: 'other', price: 0, image: 'photo-1601925260368-ae2f83cf8b7f' },
]

const LISTINGS = RAW_LISTINGS.map((item, index) => ({
  ...item,
  id: index + 1,
  image: `https://images.unsplash.com/${item.image}?w=600&q=80&auto=format&fit=crop`,
  owner: OWNERS[index % OWNERS.length],
  rating: (Math.random() * 2 + 3).toFixed(1), // Random rating between 3.0 and 5.0
}))

export default function Explore() {
  const { user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]

  function handleCategoryClick(id) {
    setSearchTerm('')
    setSelectedCategory((prev) => (prev === id ? null : id))
  }

  function handleSearchChange(e) {
    setSelectedCategory(null)
    setSearchTerm(e.target.value)
  }

  function clearFilters() {
    setSelectedCategory(null)
    setSearchTerm('')
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const isFiltering = Boolean(normalizedSearch || selectedCategory)

  const filteredListings = useMemo(() => {
    if (normalizedSearch) {
      return LISTINGS.filter((item) =>
        item.title.toLowerCase().includes(normalizedSearch)
      )
    }
    if (selectedCategory) {
      return LISTINGS.filter((item) => item.category === selectedCategory)
    }
    return LISTINGS
  }, [normalizedSearch, selectedCategory])

  const sectionTitle = normalizedSearch
    ? `Results for "${searchTerm}"`
    : selectedCategory
      ? CATEGORIES.find((c) => c.id === selectedCategory)?.label
      : 'Recommended for you'

  return (
    <div className="min-h-screen bg-soft-white">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 border-b border-jet-black/5 bg-soft-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
          <Link to="/" className="shrink-0">
            <img src="/logo-lendrop.png" alt="Lendrop" className="h-7 w-auto" />
          </Link>

          <div className="hidden max-w-md flex-1 items-center gap-2 rounded-full border border-jet-black/10 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-lavender focus-within:ring-2 focus-within:ring-lavender/30 sm:flex">
            <Search className="h-4 w-4 shrink-0 text-jet-black/35" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search cameras, tools, gear…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-jet-black/35"
            />
          </div>

          <Link
            to="/dashboard"
            aria-label="Your account"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-jet-black/10 text-jet-black/60 transition hover:border-lavender hover:text-deep-purple"
          >
            <User className="h-4 w-4" />
          </Link>
        </div>

        {/* Search bar, mobile only */}
        <div className="flex items-center gap-2 border-t border-jet-black/5 px-6 py-3 sm:hidden">
          <Search className="h-4 w-4 shrink-0 text-jet-black/35" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search cameras, tools, gear…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-jet-black/35"
          />
        </div>
      </header>

      {/* ================= GREETING ================= */}
      <section className="mx-auto max-w-6xl px-6 pt-10 sm:px-10">
        <h1 className="font-display text-2xl font-bold text-jet-black sm:text-3xl">
          {firstName ? `Welcome back, ${firstName}.` : 'Find what you need, nearby.'}
        </h1>
        <p className="mt-1 text-sm text-jet-black/50">
          Every listing below is verified and ready to pick up from a locker near you.
        </p>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mt-6 flex gap-50 overflow-x-auto border-b border-jet-black/5 pb-4 align-items-center">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                className={`flex shrink-0 flex-col items-center gap-2 border-b-2 pb-3 text-xs font-medium transition ${
                  active
                    ? 'border-jet-black text-jet-black'
                    : 'border-transparent text-jet-black/40 hover:text-jet-black/70'
                }`}
              >
                <cat.Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                {cat.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ================= LISTINGS ================= */}
      <section className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-jet-black">
            {sectionTitle}
          </h2>
          {isFiltering && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-deep-purple hover:text-lavender"
            >
              Clear filters
            </button>
          )}
        </div>

        {filteredListings.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {filteredListings.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-20 text-center">
            <p className="font-display text-lg font-semibold text-jet-black">
              No items found
            </p>
            <p className="text-sm text-jet-black/50">
              Try a different search, or browse another category.
            </p>
          </div>
        )}
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-jet-black/5 px-6 py-8 text-center sm:px-10">
        <a href="#" className="text-sm font-medium text-jet-black/50 hover:text-deep-purple">
          Need help?
        </a>
      </footer>
    </div>
  )
}

function ProductCard({ item }) {
  return (
    <article className="group cursor-pointer">
      <div className="relative overflow-hidden rounded-2xl bg-jet-black/5">
        <img
          src={item.image}
          alt={item.title}
          className="aspect-4/3 w-full object-cover transition duration-300 group-hover:scale-105"
        />

        <button
          type="button"
          aria-label="Save"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-jet-black/40 text-soft-white backdrop-blur transition hover:bg-jet-black/60"
        >
          <Heart className="h-3.5 w-3.5" />
        </button>

        {/* <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-jet-black/70 px-2.5 py-1 font-mono text-[10px] font-medium text-soft-white backdrop-blur">
          <Box className="h-3 w-3" />
          Locker {item.locker}
        </span> */}
      </div>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-jet-black">{item.title}</p>
          <div className="mt-1 flex items-center gap-1.5">
            {/* "Locker compartment" avatar frame: a rounded-square badge
                with a seam line, echoing the physical locker doors. */}
            <span className="relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-6px border border-jet-black/10 bg-lavender/15 font-mono text-[9px] font-bold text-deep-purple after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-jet-black/10">
              {item.owner.name[0]}
              {item.owner.verified && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-lavender ring-2 ring-soft-white" />
              )}
            </span>
            <span className="truncate text-xs text-jet-black/50">{item.owner.name}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          <Star className="h-3.5 w-3.5 fill-jet-black text-jet-black" />
          <span className="font-mono text-xs font-medium text-jet-black">{item.rating}</span>
        </div>
      </div>

      <p className="mt-1.5 font-mono text-sm font-semibold text-jet-black">
        ${item.price}
        <span className="font-body font-normal text-jet-black/45"> / day</span>
      </p>
    </article>
  )
}