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
      className="group block"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-border bg-surface-raised group-hover:border-primary">
        {coverUrl && (
          <img
            src={coverUrl}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        )}

        {isCurrentlyRented && (
          <span className="absolute left-2 top-2 rounded-md bg-surface px-2 py-1 text-xs font-semibold text-text">
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
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-text hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={isFavorited ? 'Remove from saved' : 'Save'}
            onClick={handleToggleFavorite}
            disabled={favoriteBusy}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-text hover:text-primary disabled:opacity-60"
          >
            <Heart className={`h-4 w-4 ${isFavorited ? 'fill-primary text-primary' : ''}`} />
          </button>
        )}

        {confirming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-jet-black/90 p-3 text-center">
            <p className="text-sm font-semibold text-white">Delete this listing?</p>
            {deleteError && <p role="alert" className="text-xs text-[#ff8a7a]">{deleteError}</p>}
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
                className="cta-brand rounded-lg px-3 py-1.5 text-xs font-semibold text-soft-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-text group-hover:text-primary">{item.title}</p>
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
              <Star className="h-3.5 w-3.5 fill-current text-text" aria-hidden="true" />
              <span className="text-xs font-semibold tabular-nums text-text">
                {Number(item.owner.average_rating).toFixed(1)}
              </span>
            </>
          ) : (
            <span className="text-xs font-semibold text-primary">New</span>
          )}
        </div>
      </div>

      <p className="mt-2 text-text">
        <span className="num text-xl">${item.price_per_day}</span>
        <span className="text-sm text-text-muted"> / day</span>
      </p>
    </Link>
  )
}
