import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus, X, Star } from 'lucide-react'
import StatusMessage from '../components/StatusMessage'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getCategoryIcon } from '../lib/categoryIcons'

const MAX_PHOTOS = 6

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
]

export default function PublishItem() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [categories, setCategories] = useState([])
  const [categoriesError, setCategoriesError] = useState('')
  const [photos, setPhotos] = useState([]) // [{ id, file, previewUrl }]
  const [categorySlug, setCategorySlug] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [condition, setCondition] = useState('good')
  const [pricePerDay, setPricePerDay] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [locationCity, setLocationCity] = useState('San Salvador')
  const [status, setStatus] = useState({ type: '', text: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [published, setPublished] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setCategoriesError('Could not load categories. Refresh to try again.')
          return
        }
        setCategories(data ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const descriptionCount = description.length
  const canAddMorePhotos = photos.length < MAX_PHOTOS

  const selectedCategory = useMemo(
    () => categories.find((c) => c.slug === categorySlug) ?? null,
    [categories, categorySlug]
  )

  function handlePhotoChange(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // allow re-selecting the same file later

    const room = MAX_PHOTOS - photos.length
    const accepted = files.slice(0, room).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setPhotos((prev) => [...prev, ...accepted])
  }

  function removePhoto(id) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus({ type: '', text: '' })

    if (photos.length === 0) {
      setStatus({ type: 'error', text: 'Add at least one photo.' })
      return
    }
    if (!selectedCategory) {
      setStatus({ type: 'error', text: 'Pick a category.' })
      return
    }
    if (title.trim().length < 3) {
      setStatus({ type: 'error', text: 'Give it a title (at least 3 characters).' })
      return
    }
    if (description.trim().length < 20) {
      setStatus({ type: 'error', text: 'Description needs at least 20 characters.' })
      return
    }
    const price = Number(pricePerDay)
    if (!price || price <= 0) {
      setStatus({ type: 'error', text: 'Enter a price per day greater than 0.' })
      return
    }

    setIsSubmitting(true)

    const { data: item, error: itemError } = await supabase
      .from('items')
      .insert({
        owner_id: user.id,
        category_id: selectedCategory.id,
        title: title.trim(),
        description: description.trim(),
        condition,
        price_per_day: price,
        deposit_amount: Number(depositAmount) || 0,
        currency: 'USD',
        location_city: locationCity.trim() || 'San Salvador',
      })
      .select()
      .single()

    if (itemError) {
      setIsSubmitting(false)
      setStatus({ type: 'error', text: 'Could not publish the item. Please try again.' })
      return
    }

    const uploads = await Promise.all(
      photos.map(async (photo, index) => {
        const ext = photo.file.name.split('.').pop()
        const path = `${user.id}/${item.id}/${index}-${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('item-photos')
          .upload(path, photo.file, { contentType: photo.file.type })
        return uploadError ? null : { item_id: item.id, storage_path: path, display_order: index }
      })
    )

    const photoRows = uploads.filter(Boolean)

    if (photoRows.length === 0) {
      await supabase.from('items').delete().eq('id', item.id)
      setIsSubmitting(false)
      setStatus({ type: 'error', text: 'Photo upload failed. Please try again.' })
      return
    }

    const { error: photosError } = await supabase.from('item_photos').insert(photoRows)
    setIsSubmitting(false)

    if (photosError) {
      setStatus({ type: 'error', text: 'Item saved, but photos failed to attach. Please try again.' })
      return
    }

    const coverUrl = supabase.storage.from('item-photos').getPublicUrl(photoRows[0].storage_path)
      .data.publicUrl

    setPublished({ ...item, coverUrl })
  }

  if (published) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-white px-6">
        <div className="w-full max-w-md rounded-2xl border border-jet-black/10 bg-white p-8 text-center shadow-[0_16px_48px_-16px_rgba(67,48,117,0.35)]">
          <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-xl bg-jet-black/5 shadow-[0_0_0_3px_rgba(165,140,244,0.25)]">
            {published.coverUrl && (
              <img src={published.coverUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-lavender">
            Live on Lendrop
          </span>
          <p className="mt-1 font-display text-lg font-semibold text-jet-black">
            Item published
          </p>
          <p className="mt-2 text-sm text-jet-black/60">
            "{published.title}" is now listed at{' '}
            <span className="font-mono">${published.price_per_day}/day</span>.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="w-full rounded-xl border border-jet-black/10 py-2.5 text-sm font-semibold text-jet-black transition hover:bg-jet-black/5"
            >
              Go to Explore
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-linear-to-r from-deep-purple to-lavender py-2.5 text-sm font-semibold text-soft-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:brightness-105"
            >
              Publish another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-soft-white pb-16">
      <header className="sticky top-0 z-50 border-b border-jet-black/5 bg-soft-white/85 backdrop-blur-md">
        <div className="h-px bg-linear-to-r from-transparent via-lavender/50 to-transparent" />
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4 sm:px-10">
          <Link
            to="/explore"
            aria-label="Back to Explore"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-jet-black/10 text-jet-black/60 transition hover:border-lavender hover:text-deep-purple"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-semibold text-jet-black">
              Publish an item
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-lavender">
              New listing
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8 px-6 pt-8 sm:px-10">
        {/* ================= PHOTOS ================= */}
        <section>
          <label className="mb-2 block text-sm font-medium text-jet-black">
            Photos
          </label>
          <p className="mb-3 text-xs text-jet-black/50">
            Add up to {MAX_PHOTOS} photos. The first one is the cover.
          </p>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-xl bg-jet-black/5"
              >
                <img
                  src={photo.previewUrl}
                  alt={`Item photo ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-linear-to-r from-deep-purple to-lavender px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-soft-white shadow-[0_2px_10px_-2px_rgba(165,140,244,0.7)]">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  aria-label="Remove photo"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-jet-black/60 text-soft-white backdrop-blur transition hover:bg-jet-black/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {canAddMorePhotos && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-jet-black/15 text-jet-black/40 transition hover:border-lavender hover:bg-lavender/5 hover:text-deep-purple hover:shadow-[0_0_0_4px_rgba(165,140,244,0.12)]">
                <ImagePlus className="h-5 w-5" />
                <span className="text-[11px] font-medium">Add photo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </section>

        {/* ================= CATEGORY ================= */}
        <section>
          <label className="mb-2 block text-sm font-medium text-jet-black">
            Category
          </label>
          {categoriesError ? (
            <p className="text-sm text-red-600">{categoriesError}</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-jet-black/40">Loading categories…</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = categorySlug === cat.slug
                const Icon = getCategoryIcon(cat.slug)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategorySlug(cat.slug)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                      active
                        ? 'border-transparent bg-linear-to-r from-deep-purple to-lavender text-soft-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)]'
                        : 'border-jet-black/10 text-jet-black/70 hover:border-lavender hover:text-deep-purple'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.25 : 1.75} />
                    {cat.name}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* ================= TITLE & DESCRIPTION ================= */}
        <section className="space-y-4">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-jet-black">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Canon EOS R6 camera, with 2 lenses"
              maxLength={80}
              className="w-full rounded-xl border border-jet-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="description" className="block text-sm font-medium text-jet-black">
                Description
              </label>
              <span className="text-xs text-jet-black/40">{descriptionCount}/500</span>
            </div>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Condition, what's included, pickup notes…"
              rows={4}
              className="w-full resize-none rounded-xl border border-jet-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
            />
          </div>
        </section>

        {/* ================= CONDITION ================= */}
        <section>
          <label className="mb-2 block text-sm font-medium text-jet-black">
            Condition
          </label>
          <div className="grid grid-cols-4 gap-2">
            {CONDITIONS.map((c) => {
              const active = condition === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCondition(c.value)}
                  className={`rounded-xl border py-2.5 text-xs font-semibold transition ${
                    active
                      ? 'border-lavender bg-lavender/10 text-deep-purple shadow-[0_0_0_1px_rgba(165,140,244,0.4)_inset]'
                      : 'border-jet-black/10 text-jet-black/60 hover:border-lavender hover:text-deep-purple'
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* ================= PRICE & DEPOSIT ================= */}
        <section className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pricePerDay" className="mb-1 block text-sm font-medium text-jet-black">
              Price per day
            </label>
            <div className="flex items-center rounded-xl border border-jet-black/10 px-4 py-2.5 transition focus-within:border-lavender focus-within:ring-2 focus-within:ring-lavender/30">
              <span className="font-mono text-sm text-jet-black/40">$</span>
              <input
                id="pricePerDay"
                type="number"
                min="0"
                step="0.01"
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
                placeholder="15.00"
                className="w-full bg-transparent pl-1.5 font-mono text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="depositAmount" className="mb-1 block text-sm font-medium text-jet-black">
              Deposit <span className="font-normal text-jet-black/40">(optional)</span>
            </label>
            <div className="flex items-center rounded-xl border border-jet-black/10 px-4 py-2.5 transition focus-within:border-lavender focus-within:ring-2 focus-within:ring-lavender/30">
              <span className="font-mono text-sm text-jet-black/40">$</span>
              <input
                id="depositAmount"
                type="number"
                min="0"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent pl-1.5 font-mono text-sm outline-none"
              />
            </div>
          </div>
        </section>

        {/* ================= LOCATION ================= */}
        <section>
          <label htmlFor="locationCity" className="mb-1 block text-sm font-medium text-jet-black">
            Pickup city
          </label>
          <input
            id="locationCity"
            type="text"
            value={locationCity}
            onChange={(e) => setLocationCity(e.target.value)}
            placeholder="San Salvador"
            className="w-full rounded-xl border border-jet-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
          />
        </section>

        {/* ================= SUMMARY PREVIEW ================= */}
        {(photos[0] || title || pricePerDay) && (
          <section>
            <p className="mb-2 text-sm font-medium text-jet-black">Preview</p>
            <div className="flex items-center gap-3 rounded-2xl border border-jet-black/10 bg-white p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-jet-black/5">
                {photos[0] && (
                  <img
                    src={photos[0].previewUrl}
                    alt="Cover preview"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-jet-black">
                  {title || 'Untitled item'}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-jet-black/50">
                  {selectedCategory && (
                    <>
                      {(() => {
                        const Icon = getCategoryIcon(selectedCategory.slug)
                        return <Icon className="h-3 w-3" />
                      })()}
                      <span>{selectedCategory.name}</span>
                      <span>·</span>
                    </>
                  )}
                  <Star className="h-3 w-3 fill-jet-black/30 text-jet-black/30" />
                  <span>New listing</span>
                </div>
              </div>
              <p className="shrink-0 font-mono text-sm font-semibold text-jet-black">
                ${pricePerDay || '0'}
                <span className="font-body font-normal text-jet-black/45"> /day</span>
              </p>
            </div>
          </section>
        )}

        <StatusMessage type={status.type} text={status.text} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-linear-to-r from-deep-purple to-lavender py-3 text-sm font-semibold text-soft-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:shadow-[0_4px_28px_-4px_rgba(165,140,244,0.75)] hover:brightness-105 disabled:opacity-50"
        >
          {isSubmitting ? 'Publishing…' : 'Publish item'}
        </button>
      </form>
    </div>
  )
}
