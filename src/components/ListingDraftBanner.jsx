import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ImagePlus, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { clearListingDraft, loadListingDraft, onListingDraftChange } from '../lib/listingDraft'

function savedAgo(iso) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

/**
 * "You left a listing half done" card, shown on Explore and My listings.
 * Renders nothing when there is no saved draft, so pages can drop it in
 * unconditionally. The draft itself is saved by PublishItem.
 */
export default function ListingDraftBanner({ className = '' }) {
  const { user } = useAuth()
  const [draft, setDraft] = useState(null)
  const [coverUrl, setCoverUrl] = useState(null)

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    const load = () =>
      loadListingDraft(user.id).then((d) => {
        if (!cancelled) setDraft(d)
      })
    load()
    const stop = onListingDraftChange(load)
    return () => {
      cancelled = true
      stop()
    }
  }, [user])

  // The cover is a stored file, so it needs its own object URL, revoked
  // when the draft changes or the card goes away.
  useEffect(() => {
    const file = draft?.photos?.[0]?.file
    if (!file) {
      setCoverUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(file)
    setCoverUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [draft])

  if (!user || !draft) return null

  const photoCount = draft.photos?.length ?? 0

  return (
    <section
      aria-label="Unfinished listing"
      className={`flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 sm:p-4 ${className}`}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-raised">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-5 w-5 text-text-muted" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">You have an unfinished listing</p>
        <p className="truncate text-xs text-text-muted">
          {draft.title?.trim() || 'Untitled item'}
          {photoCount > 0 && ` · ${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`}
          {draft.savedAt && ` · saved ${savedAgo(draft.savedAt)}`}
        </p>
      </div>
      <Link
        to="/publish"
        className="cta-brand flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-soft-white"
      >
        Continue
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={() => clearListingDraft(user.id)}
        aria-label="Discard unfinished listing"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-raised hover:text-danger"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  )
}
