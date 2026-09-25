import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ImagePlus, X } from 'lucide-react'
import StatusMessage from '../components/StatusMessage'
import VerificationNotice from '../components/VerificationNotice'
import { isVerificationError } from '../lib/verification'
import PriceSuggestionButton from '../components/PriceSuggestionButton'
import ItemSizeStep from '../components/publish/ItemSizeStep'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getCategoryIcon } from '../lib/categoryIcons'
import { getItemPhotoUrl } from '../lib/photos'
import useSmartBack from '../hooks/useSmartBack'

const MAX_PHOTOS = 6

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
]

// A numbered step of the form. The number is real sequence (the steps
// are filled in order) and turns into a check once the step is complete.
function Step({ step, hint, children }) {
  return (
    <section
      id={`step-${step.id}`}
      aria-labelledby={`step-${step.id}-title`}
      className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <div className="mb-4 flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            step.done ? 'stamp' : 'bg-surface-raised text-primary'
          }`}
          aria-hidden="true"
        >
          {step.done ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className="num text-base">{step.number}</span>}
        </span>
        <div>
          <h2 id={`step-${step.id}-title`} className="text-xl font-extrabold">
            {step.title}
            {step.done && <span className="sr-only"> (done)</span>}
          </h2>
          {hint && <p className="mt-0.5 text-sm text-text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function PhotoTile({ src, alt, cover, onRemove }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-raised">
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      {cover && (
        <span className="cta-brand absolute left-1.5 top-1.5 rounded-md px-2 py-0.5 text-xs font-semibold text-soft-white">
          Cover
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${alt.toLowerCase()}`}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-jet-black/75 text-soft-white hover:bg-jet-black"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

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
  const [locationCity, setLocationCity] = useState('')
  // Cities that have at least one active locker: an item can only be
  // dropped off where there is a locker, so these are the only choices.
  const [lockerCities, setLockerCities] = useState([])
  const [lockerCitiesLoading, setLockerCitiesLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', text: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [published, setPublished] = useState(null)
  const [sizeValues, setSizeValues] = useState({ lengthCm: null, widthCm: null, heightCm: null, weightKg: null, blocked: false })
  const [initialSizeValues, setInitialSizeValues] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('lockers')
      .select('city')
      .eq('is_active', true)
      .then(({ data }) => {
        if (cancelled) return
        const cities = [...new Set((data ?? []).map((l) => l.city).filter(Boolean))].sort((x, y) =>
          x.localeCompare(y)
        )
        setLockerCities(cities)
        // New listing with a single option: pick it for them.
        if (!isEditing && cities.length === 1) setLocationCity(cities[0])
        setLockerCitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isEditing])

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
        setLocationCity(data.location_city ?? '')
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
    if (!locationCity) {
      setStatus({ type: 'error', text: 'Choose the pickup city where you’ll drop the item off.' })
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
      location_city: locationCity,
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

  // When editing a listing whose city no longer has a locker, keep it
  // selectable so saving other changes doesn't silently move the item.
  const lockerCityOptions =
    locationCity && !lockerCities.includes(locationCity) ? [...lockerCities, locationCity] : lockerCities

  if (published) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-6">
        <div className="relative w-full max-w-md overflow-hidden glow-lg rounded-2xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-xl bg-surface-raised ring-1 ring-border">
            {published.coverUrl && (
              <img src={published.coverUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <p className="text-2xl font-extrabold">It's live on Lendrop</p>
          <p className="mt-2 text-sm text-text-muted">
            "{published.title}" is now listed at{' '}
            <span className="num">${published.price_per_day}</span>/day.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="cta-outline w-full rounded-xl py-2 text-sm font-semibold"
            >
              Go to Explore
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-xl cta-brand py-2.5 text-sm font-semibold text-soft-white glow-sm transition"
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
            <p className="text-sm text-danger">{loadError}</p>
            <Link
              to="/my-listings"
              className="cta-outline rounded-xl px-4 py-1.5 text-sm font-semibold"
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

  // Step completion, mirroring handleSubmit's checks so the checklist
  // never promises something the submit will then reject.
  const steps = [
    { id: 'photos', title: 'Photos', done: totalPhotoCount > 0 },
    {
      id: 'details',
      title: 'What it is',
      done: Boolean(selectedCategory) && title.trim().length >= 3 && description.trim().length >= 20,
    },
    { id: 'size', title: 'Size', done: sizeValues.lengthCm != null && !sizeValues.blocked },
    { id: 'price', title: 'Price', done: Number(pricePerDay) > 0 },
    { id: 'city', title: 'Pickup city', done: Boolean(locationCity) },
  ]
  const doneCount = steps.filter((st) => st.done).length
  const stepById = Object.fromEntries(steps.map((st, i) => [st.id, { ...st, number: i + 1 }]))

  const coverPreview = keptExistingPhotos[0]
    ? getItemPhotoUrl(keptExistingPhotos[0].storage_path)
    : photos[0]?.previewUrl ?? null
  const CategoryIcon = selectedCategory ? getCategoryIcon(selectedCategory.slug) : null

  const submitLabel = isEditing
    ? isSubmitting
      ? 'Saving…'
      : 'Save changes'
    : isSubmitting
      ? 'Publishing…'
      : isVerified
        ? 'Publish item'
        : 'Verify your identity to publish'

  const submitButton = (
    <button
      type="submit"
      disabled={isSubmitting || (!isEditing && !isVerified)}
      className="cta-brand w-full rounded-xl py-3 text-base font-bold text-soft-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {submitLabel}
    </button>
  )

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <header className="sticky top-0 z-50 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4 sm:px-10">
          <button
            type="button"
            onClick={goBack}
            aria-label={isEditing ? 'Back to my listings' : 'Back to Explore'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-muted hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-extrabold">{isEditing ? 'Edit listing' : 'Publish an item'}</h1>
          <p className="ml-auto text-sm text-text-muted" aria-live="polite">
            <span className="num text-lg text-text">{doneCount}</span> of {steps.length} done
          </p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mx-auto grid max-w-6xl gap-8 px-6 pt-8 sm:px-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
      >
        <div className="min-w-0 space-y-5">
          {!isEditing && <VerificationNotice status={verificationStatus} action="publish" />}

          {/* ================= 1. PHOTOS ================= */}
          <Step step={stepById.photos} hint={`Up to ${MAX_PHOTOS}. The first one is the cover renters see.`}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {keptExistingPhotos.map((photo, index) => (
                <PhotoTile
                  key={photo.id}
                  src={getItemPhotoUrl(photo.storage_path)}
                  alt={`Item photo ${index + 1}`}
                  cover={index === 0}
                  onRemove={() => setRemovedPhotoIds((prev) => [...prev, photo.id])}
                />
              ))}
              {photos.map((photo, index) => (
                <PhotoTile
                  key={photo.id}
                  src={photo.previewUrl}
                  alt={`Item photo ${keptExistingPhotos.length + index + 1}`}
                  cover={keptExistingPhotos.length === 0 && index === 0}
                  onRemove={() => removePhoto(photo.id)}
                />
              ))}
              {canAddMorePhotos && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-text-muted hover:border-primary hover:text-primary">
                  <ImagePlus className="h-6 w-6" aria-hidden="true" />
                  <span className="text-sm font-semibold">Add photo</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="sr-only" />
                </label>
              )}
            </div>
          </Step>

          {/* ================= 2. WHAT IT IS ================= */}
          <Step step={stepById.details} hint="Category, a clear title, and what renters should know.">
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-text">Category</p>
                {categoriesError ? (
                  <p className="text-sm text-danger">{categoriesError}</p>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-text-muted">Loading categories…</p>
                ) : (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
                    {categories.map((cat) => {
                      const active = categorySlug === cat.slug
                      const Icon = getCategoryIcon(cat.slug)
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategorySlug(cat.slug)}
                          aria-pressed={active}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold ${
                            active
                              ? 'stamp border-transparent'
                              : 'border-border bg-surface text-text-muted hover:border-primary hover:text-text'
                          }`}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                          {cat.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="title" className="mb-1 block text-sm font-semibold text-text">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Canon EOS R6 camera, with 2 lenses"
                  maxLength={80}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="description" className="block text-sm font-semibold text-text">
                    Description
                  </label>
                  <span className={`text-xs tabular-nums ${descriptionCount < 20 ? 'text-text-muted' : 'text-success'}`}>
                    {descriptionCount}/500{descriptionCount < 20 ? ` · ${20 - descriptionCount} more to go` : ''}
                  </span>
                </div>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Condition, what's included, anything a renter should know…"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-text">Condition</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Condition">
                  {CONDITIONS.map((c) => {
                    const active = condition === c.value
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCondition(c.value)}
                        aria-pressed={active}
                        className={`rounded-lg border py-2 text-sm font-semibold ${
                          active
                            ? 'stamp border-transparent'
                            : 'border-border bg-surface text-text-muted hover:border-primary hover:text-text'
                        }`}
                      >
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </Step>

          {/* ================= 3. SIZE ================= */}
          <Step step={stepById.size} hint="So we know it fits a locker compartment.">
            <ItemSizeStep
              category={categorySlug}
              title={title}
              description={description}
              initialDimensions={initialSizeValues}
              onChange={setSizeValues}
            />
          </Step>

          {/* ================= 4. PRICE ================= */}
          <Step step={stepById.price} hint="You always set the final price.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pricePerDay" className="mb-1 block text-sm font-semibold text-text">
                  Price per day
                </label>
                <div className="flex items-center rounded-xl border border-border bg-surface px-4 py-2.5 focus-within:border-primary">
                  <span className="text-sm tabular-nums text-text-muted">$</span>
                  <input
                    id="pricePerDay"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricePerDay}
                    onChange={(e) => setPricePerDay(e.target.value)}
                    placeholder="15.00"
                    className="w-full bg-transparent pl-1.5 text-sm tabular-nums outline-none"
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
                <label htmlFor="declaredValue" className="mb-1 block text-sm font-semibold text-text">
                  Replacement value
                </label>
                <div className="flex items-center rounded-xl border border-border bg-surface px-4 py-2.5 focus-within:border-primary">
                  <span className="text-sm tabular-nums text-text-muted">$</span>
                  <input
                    id="declaredValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={declaredValue}
                    onChange={(e) => setDeclaredValue(e.target.value)}
                    placeholder="0.00"
                    aria-describedby="declaredValue-hint"
                    className="w-full bg-transparent pl-1.5 text-sm tabular-nums outline-none"
                  />
                </div>
                <p id="declaredValue-hint" className="mt-1.5 text-xs text-text-muted">
                  What it would cost to replace. Sets the renter's refundable damage hold (35% of this,
                  capped by category).
                </p>
              </div>
            </div>
          </Step>

          {/* ================= 5. PICKUP CITY ================= */}
          <Step step={stepById.city} hint="Only cities with a Lendrop locker: that's where you'll drop it off.">
            <label htmlFor="locationCity" className="sr-only">
              Pickup city
            </label>
            <select
              id="locationCity"
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              required
              disabled={lockerCitiesLoading || lockerCityOptions.length === 0}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-60"
            >
              <option value="" disabled>
                {lockerCitiesLoading ? 'Loading cities…' : 'Choose a city'}
              </option>
              {lockerCityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                  {!lockerCities.includes(city) ? ' (no locker there any more)' : ''}
                </option>
              ))}
            </select>
            {!lockerCitiesLoading && lockerCityOptions.length === 0 && (
              <p className="mt-2 text-sm text-danger">
                There are no active lockers yet, so items can't be published right now.
              </p>
            )}
          </Step>

          {/* Submit on phones and tablets; desktop uses the sidebar. */}
          <div className="space-y-3 lg:hidden">
            <StatusMessage type={status.type} text={status.text} />
            {submitButton}
          </div>
        </div>

        {/* ================= LIVE PREVIEW (sticky on desktop) ================= */}
        <aside className="space-y-4 lg:sticky lg:top-24" aria-label="Listing preview">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="aspect-4/3 bg-surface-raised">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-text-muted">
                  <ImagePlus className="h-7 w-7" aria-hidden="true" />
                  <span className="text-sm">Your cover photo</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="flex items-center gap-1.5 text-xs text-text-muted">
                {CategoryIcon && <CategoryIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                {selectedCategory?.name ?? 'Category'}
                {locationCity && <span>· {locationCity}</span>}
              </p>
              <p className="mt-1 truncate text-lg font-bold">{title.trim() || 'Your item title'}</p>
              <p className="mt-2 text-text">
                <span className="num text-2xl">${Number(pricePerDay) > 0 ? pricePerDay : '0'}</span>
                <span className="text-sm text-text-muted"> / day</span>
              </p>
            </div>
          </div>

          <ol className="rounded-2xl border border-border bg-surface p-4" aria-label="Steps">
            {steps.map((st, index) => (
              <li key={st.id}>
                <a
                  href={`#step-${st.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-raised"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                      st.done ? 'stamp' : 'border border-border text-text-muted'
                    }`}
                    aria-hidden="true"
                  >
                    {st.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                  </span>
                  <span className={st.done ? 'font-semibold text-text' : 'text-text-muted'}>{st.title}</span>
                  <span className="sr-only">{st.done ? '(done)' : '(to do)'}</span>
                </a>
              </li>
            ))}
          </ol>

          <div className="hidden space-y-3 lg:block">
            <StatusMessage type={status.type} text={status.text} />
            {submitButton}
          </div>
        </aside>
      </form>
    </div>
  )
}
