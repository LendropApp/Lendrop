import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Star, Trash2 } from 'lucide-react'
import { getItemPhotoUrl } from '../lib/photos'
import LockerAvatar from './LockerAvatar'

export function coverUrlFor(photos) {
  if (!photos?.length) return null
  const [cover] = [...photos].sort((a, b) => a.display_order - b.display_order)
  return getItemPhotoUrl(cover.storage_path)
}

export default function ProductCard({ item, isOwner, isFavorited, isCurrentlyRented, onDelete, onToggleFavorite }) {
  const coverUrl = coverUrlFor(item.photos)
  const hasReviews = (item.owner?.total_reviews ?? 0) > 0

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [favoriteBusy, setFavoriteBusy] = useState(false)

  async function handleConfirmDelete(e) {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(true)
    setDeleteError('')
    const { error } = await onDelete(item)
    if (error) {
      setDeleting(false)
      setDeleteError('Could not delete. Try again.')
    }
  }

  async function handleToggleFavorite(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!onToggleFavorite || favoriteBusy) return
    setFavoriteBusy(true)
    await onToggleFavorite(item)
    setFavoriteBusy(false)
  }

  return (
    <Link
      to={`/item/${item.id}`}
      className="lift group block cursor-pointer"
    >
      <div className="glow-sm relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-surface-raised transition duration-300 group-hover:shadow-[0_24px_60px_-16px_rgba(67,48,117,0.45),0_8px_24px_-8px_rgba(165,140,244,0.5)]">
        {coverUrl && (
          <img
            src={coverUrl}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-jet-black/5 transition group-hover:ring-lavender/50" />

        {isCurrentlyRented && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-jet-black/70 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-soft-white backdrop-blur">
            Currently rented
          </span>
        )}

        {isOwner ? (
          <button
            type="button"
            aria-label="Delete listing"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setConfirming(true)
            }}
            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-jet-black/40 text-soft-white backdrop-blur transition hover:bg-red-500/80"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={isFavorited ? 'Remove from saved' : 'Save'}
            onClick={handleToggleFavorite}
            disabled={favoriteBusy}
            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-jet-black/40 text-soft-white backdrop-blur transition hover:bg-jet-black/60 disabled:opacity-60"
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorited ? 'fill-primary text-primary' : ''}`} />
          </button>
        )}

        {confirming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-jet-black/75 p-3 text-center backdrop-blur-sm">
            <p className="text-xs font-medium text-white">Delete this listing?</p>
            {deleteError && <p className="text-[11px] text-red-300">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setConfirming(false)
                  setDeleteError('')
                }}
                disabled={deleting}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">{item.title}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <LockerAvatar
              label={item.owner?.full_name}
              photoUrl={item.owner?.avatar_url}
              verified={item.owner?.verification_status === 'verified'}
              size="sm"
            />
            <span className="truncate text-xs text-text-muted">{item.owner?.full_name}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          {hasReviews ? (
            <>
              <Star className="h-3.5 w-3.5 fill-jet-black text-text" />
              <span className="font-mono text-xs font-medium text-text">
                {Number(item.owner.average_rating).toFixed(1)}
              </span>
            </>
          ) : (
            <span className="rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-primary">
              New
            </span>
          )}
        </div>
      </div>

      <p className="mt-1.5 font-mono text-sm font-semibold text-text">
        ${item.price_per_day}
        <span className="font-body font-normal text-text-muted"> / day</span>
      </p>
    </Link>
  )
}
