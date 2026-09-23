import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, X, Star } from 'lucide-react'
import StatusMessage from '../components/StatusMessage'
import VerificationNotice from '../components/VerificationNotice'
import { isVerificationError } from '../lib/verification'
import PriceSuggestionButton from '../components/PriceSuggestionButton'
import ItemSizeStep from '../components/publish/ItemSizeStep'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getCategoryIcon } from '../lib/categoryIcons'
import { getItemPhotoUrl } from '../lib/photos'
import AuroraBlobs from '../components/background/AuroraBlobs'
import useSmartBack from '../hooks/useSmartBack'

const MAX_PHOTOS = 6

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
]

// One form, two modes. With an :itemId in the route it loads that
// listing and saves with an update; without one it creates a new item.
// Keeping it as a single component means the publish and edit forms
// can't drift apart in validation, field set or copy.
export default function PublishItem() {
  const { user, verificationStatus, isVerified } = useAuth()
  const navigate = useNavigate()
  const { itemId } = useParams()
  const isEditing = Boolean(itemId)
  const goBack = useSmartBack(isEditing ? '/my-listings' : '/explore')

  const [categories, setCategories] = useState([])
  const [categoriesError, setCategoriesError] = useState('')
  const [photos, setPhotos] = useState([]) // newly picked: [{ id, file, previewUrl }]
  const [existingPhotos, setExistingPhotos] = useState([]) // already stored: item_photos rows
  const [removedPhotoIds, setRemovedPhotoIds] = useState([])
  const [loadingItem, setLoadingItem] = useState(isEditing)
  const [loadError, setLoadError] = useState('')
  const [categorySlug, setCategorySlug] = useState(null)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [condition, setCondition] = useState('good')
  const [pricePerDay, setPricePerDay] = useState('')
  const [declaredValue, setDeclaredValue] = useState('')
  const [locationCity, setLocationCity] = useState('San Salvador')
  const [status, setStatus] = useState({ type: '', text: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [published, setPublished] = useState(null)
  const [sizeValues, setSizeValues] = useState({ lengthCm: null, widthCm: null, heightCm: null, weightKg: null, blocked: false })
  const [initialSizeValues, setInitialSizeValues] = useState(null)

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

  // Prefill from the listing being edited. The ownership check is
  // belt-and-braces for the UI: items_update_own already makes a save on
  // someone else's listing fail server-side, but bouncing here means the
  // user never fills in a form that was never going to save.
  useEffect(() => {
    if (!isEditing || !user) return
    let cancelled = false
    setLoadingItem(true)

    supabase
      .from('items')
      .select('*, photos:item_photos(id, storage_path, display_order)')
      .eq('id', itemId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setLoadError('Could not load this listing.')
          setLoadingItem(false)
          return
        }
        if (data.owner_id !== user.id) {
          setLoadError('This listing belongs to someone else.')
          setLoadingItem(false)
          return
        }
        setTitle(data.title ?? '')
        setDescription(data.description ?? '')
        setCondition(data.condition ?? 'good')
        setPricePerDay(String(data.price_per_day ?? ''))
        setDeclaredValue(data.declared_value ? String(data.declared_value) : '')
        setLocationCity(data.location_city ?? 'San Salvador')
        if (data.length_cm != null) {
          setInitialSizeValues({
            lengthCm: Number(data.length_cm),
            widthCm: Number(data.width_cm),
            heightCm: Number(data.height_cm),
            weightKg: data.weight_kg != null ? Number(data.weight_kg) : '',
          })
        }
        setExistingPhotos(
          [...(data.photos ?? [])].sort((a, b) => a.display_order - b.display_order)
        )
        setEditingCategoryId(data.category_id)
        setLoadingItem(false)
      })

    return () => {
      cancelled = true
    }
  }, [isEditing, itemId, user])

  // Categories and the item load independently, so the slug can only be
  // resolved once both are in.
  useEffect(() => {
    if (!editingCategoryId || categories.length === 0) return
    const match = categories.find((c) => c.id === editingCategoryId)
    if (match) setCategorySlug(match.slug)
  }, [editingCategoryId, categories])

  const keptExistingPhotos = existingPhotos.filter((p) => !removedPhotoIds.includes(p.id))
  const totalPhotoCount = keptExistingPhotos.length + photos.length

  const descriptionCount = description.length
  const canAddMorePhotos = totalPhotoCount < MAX_PHOTOS

  const selectedCategory = useMemo(
    () => categories.find((c) => c.slug === categorySlug) ?? null,
    [categories, categorySlug]
  )

  function handlePhotoChange(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // allow re-selecting the same file later

    const room = MAX_PHOTOS - totalPhotoCount
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

    if (totalPhotoCount === 0) {
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
    if (sizeValues.blocked) {
      setStatus({ type: 'error', text: 'This item is too large for our lockers. Adjust its measurements before publishing.' })
      return
    }

    // Only creating a listing is gated on verification — editing one you
    // already own isn't, which matches items_update_own server-side.
    // VerifiedRoute normally keeps unverified users off the create form,
    // so this is the backstop for a status that changed mid-session; the
    // real gate is the items_insert_own RLS policy (migration 0019),
    // handled below.
    if (!isEditing && !isVerified) {
      setStatus({
        type: 'error',
        text: 'You need to verify your identity before publishing an item.',
      })
      return
    }

    setIsSubmitting(true)

    const fields = {
      category_id: selectedCategory.id,
      title: title.trim(),
      description: description.trim(),
      condition,
      price_per_day: price,
      declared_value: Number(declaredValue) || 0,
      currency: 'USD',
      location_city: locationCity.trim() || 'San Salvador',
      // required_locker_size / dimensions_source are never sent -- the
      // set_item_required_locker_size trigger always computes them.
      ...(sizeValues.lengthCm != null
        ? {
            length_cm: sizeValues.lengthCm,
            width_cm: sizeValues.widthCm,
            height_cm: sizeValues.heightCm,
            weight_kg: sizeValues.weightKg,
          }
        : {}),
    }

    const { data: item, error: itemError } = isEditing
      ? await supabase.from('items').update(fields).eq('id', itemId).select().single()
      : await supabase
          .from('items')
          .insert({ owner_id: user.id, ...fields })
          .select()
          .single()

    if (itemError) {
      setIsSubmitting(false)
      setStatus({
        type: 'error',
        text: isVerificationError(itemError)
          ? 'You need to verify your identity before publishing an item.'
          : isEditing
            ? 'Could not save your changes. Please try again.'
            : 'Could not publish the item. Please try again.',
      })
      return
    }

    // New photos are numbered after the ones being kept, so the first
    // remaining photo stays the cover.
    const uploads = await Promise.all(
      photos.map(async (photo, index) => {
        const ext = photo.file.name.split('.').pop()
        const path = `${user.id}/${item.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('item-photos')
          .upload(path, photo.file, { contentType: photo.file.type })
        return uploadError
          ? null
          : {
              item_id: item.id,
              storage_path: path,
              display_order: keptExistingPhotos.length + index,
            }
      })
    )

    const photoRows = uploads.filter(Boolean)

    if (!isEditing && photoRows.length === 0) {
      // A listing with no photo is worse than no listing — roll the row
      // back rather than leave an empty one behind.
      await supabase.from('items').delete().eq('id', item.id)
      setIsSubmitting(false)
      setStatus({ type: 'error', text: 'Photo upload failed. Please try again.' })
      return
    }

    if (photoRows.length > 0) {
      const { error: photosError } = await supabase.from('item_photos').insert(photoRows)
      if (photosError) {
        setIsSubmitting(false)
        setStatus({
          type: 'error',
          text: 'Item saved, but photos failed to attach. Please try again.',
        })
        return
      }
    }

    if (isEditing && removedPhotoIds.length > 0) {
      const removed = existingPhotos.filter((photo) => removedPhotoIds.includes(photo.id))
      await supabase.from('item_photos').delete().in('id', removedPhotoIds)
      // Demo listings store an external URL here rather than a bucket
      // path (see getItemPhotoUrl) — there is nothing to delete for those.
      const paths = removed.map((p) => p.storage_path).filter((path) => !/^https?:\/\//i.test(path))
      if (paths.length > 0) await supabase.storage.from('item-photos').remove(paths)
    }

    setIsSubmitting(false)

    if (isEditing) {
      navigate('/my-listings', { state: { saved: item.title } })
      return
    }

    const coverUrl = supabase.storage.from('item-photos').getPublicUrl(photoRows[0].storage_path)
      .data.publicUrl

    setPublished({ ...item, coverUrl })
  }

  if (published) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-6">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface p-8 text-center shadow-[0_16px_48px_-16px_rgba(67,48,117,0.35)]">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-lavender to-transparent" />
          <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-xl bg-surface-raised shadow-[0_0_0_3px_rgba(165,140,244,0.25)]">
            {published.coverUrl && (
              <img src={published.coverUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
            Live on Lendrop
          </span>
          <p className="mt-1 font-display text-lg font-semibold text-text">
            Item published
          </p>
          <p className="mt-2 text-sm text-text-muted">
            "{published.title}" is now listed at{' '}
            <span className="font-mono">${published.price_per_day}/day</span>.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-text transition hover:bg-surface-raised"
            >
              Go to Explore
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-linear-to-r from-deep-purple to-lavender py-2.5 text-sm font-semibold text-soft-white glow-sm transition hover:brightness-105"
            >
              Publish another
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isEditing && (loadingItem || loadError)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6">
        {loadError ? (
          <>
            <p className="text-sm text-red-600">{loadError}</p>
            <Link
              to="/my-listings"
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface-raised"
            >
              Back to my listings
            </Link>
          </>
        ) : (
          <p className="font-body text-sm text-text-muted">Loading…</p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <header className="glass sticky top-0 z-50">
        <div className="h-px bg-linear-to-r from-transparent via-lavender/50 to-transparent" />
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4 sm:px-10">
          <button
            type="button"
            onClick={goBack}
            aria-label={isEditing ? 'Back to my listings' : 'Back to Explore'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-muted transition hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-lg font-semibold text-text">
              {isEditing ? 'Edit listing' : 'Publish an item'}
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
              {isEditing ? 'Update details' : 'New listing'}
            </p>
          </div>
        </div>
      </header>

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-30" />
      <form onSubmit={handleSubmit} className="relative mx-auto max-w-2xl space-y-8 px-6 pt-8 sm:px-10">
        {!isEditing && <VerificationNotice status={verificationStatus} action="publish" />}

        {/* ================= PHOTOS ================= */}
        <section>
          <label className="mb-2 block text-sm font-medium text-text">
            Photos
          </label>
          <p className="mb-3 text-xs text-text-muted">
            Add up to {MAX_PHOTOS} photos. The first one is the cover.
          </p>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {keptExistingPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-xl bg-surface-raised"
              >
                <img
                  src={getItemPhotoUrl(photo.storage_path)}
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
                  onClick={() => setRemovedPhotoIds((prev) => [...prev, photo.id])}
                  aria-label="Remove photo"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-jet-black/60 text-soft-white backdrop-blur transition hover:bg-jet-black/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-xl bg-surface-raised"
              >
                <img
                  src={photo.previewUrl}
                  alt={`Item photo ${keptExistingPhotos.length + index + 1}`}
                  className="h-full w-full object-cover"
                />
                {keptExistingPhotos.length === 0 && index === 0 && (
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
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-text-muted transition hover:border-primary hover:bg-surface-raised hover:text-primary hover:shadow-[0_0_0_4px_rgba(165,140,244,0.12)]">
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
          <label className="mb-2 block text-sm font-medium text-text">
            Category
          </label>
          {categoriesError ? (
            <p className="text-sm text-red-600">{categoriesError}</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-text-muted">Loading categories…</p>
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
                        ? 'border-transparent bg-linear-to-r from-deep-purple to-lavender text-soft-white glow-sm'
                        : 'border-border text-text-muted hover:border-primary hover:text-primary'
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
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-text">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Canon EOS R6 camera, with 2 lenses"
              maxLength={80}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-lavender/30"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="description" className="block text-sm font-medium text-text">
                Description
              </label>
              <span className="text-xs text-text-muted">{descriptionCount}/500</span>
            </div>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Condition, what's included, pickup notes…"
              rows={4}
              className="w-full resize-none rounded-xl border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-lavender/30"
            />
          </div>
        </section>

        {/* ================= SIZE ================= */}
        <ItemSizeStep
          category={categorySlug}
          title={title}
          description={description}
          initialDimensions={initialSizeValues}
          onChange={setSizeValues}
        />

        {/* ================= CONDITION ================= */}
        <section>
          <label className="mb-2 block text-sm font-medium text-text">
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
                      ? 'border-primary bg-surface-raised text-primary shadow-[0_0_0_1px_rgba(165,140,244,0.4)_inset]'
                      : 'border-border text-text-muted hover:border-primary hover:text-primary'
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
            <label htmlFor="pricePerDay" className="mb-1 block text-sm font-medium text-text">
              Price per day
            </label>
            <div className="flex items-center rounded-xl border border-border px-4 py-2.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-lavender/30">
              <span className="font-mono text-sm text-text-muted">$</span>
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
            <PriceSuggestionButton
              category={categorySlug}
              description={description}
              condition={condition}
              onApply={(price) => setPricePerDay(String(price))}
            />
          </div>

          <div>
            <label htmlFor="declaredValue" className="mb-1 block text-sm font-medium text-text">
              Declared value <span className="font-normal text-text-muted">(what it costs to replace)</span>
            </label>
            <div className="flex items-center rounded-xl border border-border px-4 py-2.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-lavender/30">
              <span className="font-mono text-sm text-text-muted">$</span>
              <input
                id="declaredValue"
                type="number"
                min="0"
                step="0.01"
                value={declaredValue}
                onChange={(e) => setDeclaredValue(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent pl-1.5 font-mono text-sm outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Used to set the renter's refundable damage-liability hold (35% of this, capped by category).
            </p>
          </div>
        </section>

        {/* ================= LOCATION ================= */}
        <section>
          <label htmlFor="locationCity" className="mb-1 block text-sm font-medium text-text">
            Pickup city
          </label>
          <input
            id="locationCity"
            type="text"
            value={locationCity}
            onChange={(e) => setLocationCity(e.target.value)}
            placeholder="San Salvador"
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-lavender/30"
          />
        </section>

        {/* ================= SUMMARY PREVIEW ================= */}
        {(photos[0] || title || pricePerDay) && (
          <section>
            <p className="mb-2 text-sm font-medium text-text">Preview</p>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-raised">
                {photos[0] && (
                  <img
                    src={photos[0].previewUrl}
                    alt="Cover preview"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {title || 'Untitled item'}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
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
                  <Star className="h-3 w-3 fill-jet-black/30 text-text-muted" />
                  <span>New listing</span>
                </div>
              </div>
              <p className="shrink-0 font-mono text-sm font-semibold text-text">
                ${pricePerDay || '0'}
                <span className="font-body font-normal text-text-muted"> /day</span>
              </p>
            </div>
          </section>
        )}

        <StatusMessage type={status.type} text={status.text} />

        <button
          type="submit"
          disabled={isSubmitting || (!isEditing && !isVerified)}
          className="w-full rounded-xl bg-linear-to-r from-deep-purple to-lavender py-3 text-sm font-semibold text-soft-white glow-sm transition hover:shadow-[0_4px_28px_-4px_rgba(165,140,244,0.75)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEditing
            ? isSubmitting
              ? 'Saving…'
              : 'Save changes'
            : isSubmitting
              ? 'Publishing…'
              : isVerified
                ? 'Publish item'
                : 'Verify your identity to publish'}
        </button>
      </form>
      </div>
    </div>
  )
}
