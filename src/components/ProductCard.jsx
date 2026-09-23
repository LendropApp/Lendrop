import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Star, Trash2 } from 'lucide-react'
import { getItemPhotoUrl } from '../lib/photos'
import DoorCard from './ui/DoorCard'
import LockerAvatar from './LockerAvatar'

/**
 * The item card used by Explore and Favorites.
 *
 * Purely a composition over ui/DoorCard now — the door anatomy, the press and
 * the LED all come from the design system, and this file only maps an `items`
 * row onto it and owns the save/delete interactions. Same props and same
 * behaviour as before the redesign; nothing here talks to Supabase itself.
 */

export function coverUrlFor(photos) {
  if (!photos?.length) return null
  const [cover] = [...photos].sort((a, b) => a.display_order - b.display_order)
  return getItemPhotoUrl(cover.storage_path)
}

// Corner button sitting on the photo: square, 2px ink, like every other
// pressable surface (sec. 4) — not the floating translucent circle it replaced.
// 44px because sec. 10 puts a floor under every touch target, even one this
// incidental.
const CORNER_BUTTON =
  'flex size-11 items-center justify-center rounded-door border-2 border-ink bg-panel text-ink press-sm disabled:opacity-60'

export default function ProductCard({
  item,
  isOwner,
  isFavorited,
  isCurrentlyRented,
  onDelete,
  onToggleFavorite,
}) {
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

  // The LED reads the same two fields the list already filters on, so a card
  // never claims a state the grid disagrees with.
  const status = isCurrentlyRented ? 'reserved' : item.is_available ? 'available' : 'unavailable'

  const action = isOwner ? (
    <button
      type="button"
      aria-label="Delete listing"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setConfirming(true)
      }}
      className={CORNER_BUTTON}
    >
      <Trash2 className="size-4" strokeWidth={2} aria-hidden="true" />
    </button>
  ) : (
    <button
      type="button"
      aria-label={isFavorited ? 'Remove from saved' : 'Save'}
      aria-pressed={isFavorited}
      onClick={handleToggleFavorite}
      disabled={favoriteBusy}
      className={CORNER_BUTTON}
    >
      <Heart
        className={`size-4 ${isFavorited ? 'fill-lilac text-lilac' : ''}`}
        strokeWidth={2}
        aria-hidden="true"
      />
    </button>
  )

  const meta = (
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5">
        <LockerAvatar
          label={item.owner?.full_name}
          photoUrl={item.owner?.avatar_url}
          verified={item.owner?.verification_status === 'verified'}
          size="sm"
        />
        <span className="truncate text-small text-steel-600">{item.owner?.full_name}</span>
      </span>

      {hasReviews ? (
        <span className="flex shrink-0 items-center gap-1">
          <Star className="size-3.5 fill-ink text-ink" aria-hidden="true" />
          <span className="font-mono text-small text-ink">
            {Number(item.owner.average_rating).toFixed(1)}
          </span>
        </span>
      ) : (
        <span className="shrink-0 rounded-tag border-2 border-ink bg-lilac-200 px-1.5 py-0.5 font-mono text-label uppercase text-ink">
          New
        </span>
      )}
    </div>
  )

  // Inline confirmation rather than a dialog: it is a two-tap decision scoped to
  // one card, and a modal would lose which card it belonged to.
  const overlay = confirming ? (
    <div className="flex size-full flex-col items-center justify-center gap-2 border-b-2 border-ink bg-night/90 p-3 text-center">
      <p className="text-small font-bold text-panel">Delete this listing?</p>
      {deleteError && <p className="text-label font-mono uppercase text-signal">{deleteError}</p>}
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
          className="rounded-door border-2 border-ink bg-panel px-3 py-1.5 text-small font-bold text-ink press-sm disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirmDelete}
          disabled={deleting}
          className="rounded-door border-2 border-ink bg-alert-700 px-3 py-1.5 text-small font-bold text-panel press-sm disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  ) : null

  return (
    <DoorCard
      as={Link}
      to={`/item/${item.id}`}
      title={item.title}
      photoUrl={coverUrl}
      alt={item.title}
      price={Number(item.price_per_day)}
      category={item.category?.name}
      status={status}
      size={item.required_locker_size}
      estimated={item.dimensions_source === 'category_default'}
      action={action}
      meta={meta}
      overlay={overlay}
    />
  )
}
