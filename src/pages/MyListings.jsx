import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Eye, EyeOff, PackagePlus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getItemPhotoUrl } from '../lib/photos'
import { getCategoryIcon } from '../lib/categoryIcons'
import PageHeader from '../components/PageHeader'
import StatusMessage from '../components/StatusMessage'
import VerificationNotice from '../components/VerificationNotice'
import AuroraBlobs from '../components/background/AuroraBlobs'

// is_available doubles as the published/paused switch: a paused listing
// still exists and stays editable, it just drops out of Explore and out
// of the reservation RPCs, which only pick up available items.
const STATUS_META = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700' },
  paused: { label: 'Paused', className: 'bg-amber-100 text-amber-700' },
}

export default function MyListings() {
  const { user, verificationStatus, isVerified } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState(
    location.state?.saved
      ? { type: 'success', text: `"${location.state.saved}" updated.` }
      : { type: '', text: '' }
  )
  const [busyId, setBusyId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const loadItems = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('items')
      .select(
        `id, title, price_per_day, is_available, created_at, required_locker_size,
         category:categories(name, slug),
         photos:item_photos(storage_path, display_order)`
      )
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (loadError) {
      setError('Could not load your listings. Refresh to try again.')
      setLoading(false)
      return
    }
    setError('')
    setItems(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  async function handleTogglePause(item) {
    setBusyId(item.id)
    setStatus({ type: '', text: '' })
    const { error: updateError } = await supabase
      .from('items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id)
    setBusyId(null)

    if (updateError) {
      setStatus({ type: 'error', text: 'Could not change that listing. Please try again.' })
      return
    }
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, is_available: !row.is_available } : row))
    )
  }

  async function handleDelete(item) {
    setBusyId(item.id)
    setStatus({ type: '', text: '' })

    // Same order ItemDetail uses: storage objects first, then the row —
    // item_photos cascades with the item, so deleting the row first
    // would lose the paths before the files are gone. Demo listings keep
    // an external URL here and have nothing in the bucket to remove.
    const paths = (item.photos ?? [])
      .map((p) => p.storage_path)
      .filter((path) => path && !/^https?:\/\//i.test(path))
    if (paths.length > 0) await supabase.storage.from('item-photos').remove(paths)

    const { error: deleteError } = await supabase.from('items').delete().eq('id', item.id)
    setBusyId(null)
    setConfirmDeleteId(null)

    if (deleteError) {
      setStatus({
        type: 'error',
        text: 'Could not delete that listing. It may have reservations attached.',
      })
      return
    }
    setItems((prev) => prev.filter((row) => row.id !== item.id))
    setStatus({ type: 'success', text: `"${item.title}" deleted.` })
  }

  function handlePublishClick() {
    if (!isVerified) {
      navigate('/verification', { state: { reason: 'publish' } })
      return
    }
    navigate('/publish')
  }

  return (
    <div className="min-h-screen bg-soft-white pb-28 md:pb-16">
      <PageHeader backTo="/profile" backLabel="Back to Profile" maxWidth="max-w-4xl" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-4xl px-6 py-8 sm:px-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-jet-black">My listings</h1>
              <p className="mt-1 text-sm text-jet-black/50">
                Everything you've put up for rent on Lendrop.
              </p>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={handlePublishClick}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-linear-to-r from-deep-purple to-lavender px-4 py-2.5 text-sm font-semibold text-soft-white glow-sm transition hover:brightness-105"
              >
                <PackagePlus className="h-4 w-4" />
                <span className="hidden sm:inline">New listing</span>
              </button>
            )}
          </div>

          <div className="mt-4">
            <StatusMessage type={status.type} text={status.text} />
          </div>

          {!isVerified && (
            <VerificationNotice status={verificationStatus} action="publish" className="mt-4" />
          )}

          {error ? (
            <p className="py-20 text-center text-sm text-red-600">{error}</p>
          ) : loading ? (
            <p className="py-20 text-center text-sm text-jet-black/40">Loading your listings…</p>
          ) : items.length === 0 ? (
            <section className="mt-6 rounded-2xl border border-dashed border-lavender/30 bg-white/60 px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-lavender/10">
                <PackagePlus className="h-6 w-6 text-deep-purple" />
              </div>
              <p className="mt-4 font-display text-lg font-semibold text-jet-black">
                You haven't listed anything yet
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-jet-black/55">
                {isVerified
                  ? 'Put that camera, drill or tent to work. Listing takes a couple of minutes.'
                  : 'Verify your identity and you can list your first item in a couple of minutes.'}
              </p>
              <button
                type="button"
                onClick={handlePublishClick}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-deep-purple to-lavender px-5 py-2.5 text-sm font-semibold text-soft-white glow-sm transition hover:brightness-105"
              >
                <PackagePlus className="h-4 w-4" />
                {isVerified ? 'Publish your first item' : 'Verify to start listing'}
              </button>
            </section>
          ) : (
            <ul className="mt-6 space-y-3">
              {items.map((item) => {
                const cover = [...(item.photos ?? [])].sort(
                  (a, b) => a.display_order - b.display_order
                )[0]
                const meta = item.is_available ? STATUS_META.active : STATUS_META.paused
                const CategoryIcon = getCategoryIcon(item.category?.slug)
                const busy = busyId === item.id

                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-lavender/15 bg-white p-3 transition hover:border-lavender/40"
                  >
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/item/${item.id}`}
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-jet-black/5"
                      >
                        {cover && (
                          <img
                            src={getItemPhotoUrl(cover.storage_path)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/item/${item.id}`}
                            className="truncate font-display text-sm font-semibold text-jet-black transition hover:text-deep-purple"
                          >
                            {item.title}
                          </Link>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                          {!item.required_locker_size && (
                            <span
                              title="This item doesn't fit in any of our lockers yet — fix its measurements in Edit."
                              className="flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Too large
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-jet-black/50">
                          <CategoryIcon className="h-3 w-3" />
                          {item.category?.name ?? 'Uncategorised'}
                        </p>
                        <p className="mt-1 font-mono text-sm font-semibold text-jet-black">
                          ${Number(item.price_per_day).toFixed(2)}
                          <span className="font-body font-normal text-jet-black/45"> /day</span>
                        </p>
                      </div>
                    </div>

                    {confirmDeleteId === item.id ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-jet-black/5 pt-3">
                        <p className="text-xs text-jet-black/60">Delete this listing for good?</p>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={busy}
                          className="ml-auto rounded-full border border-jet-black/10 px-3 py-1.5 text-xs font-semibold text-jet-black/70 transition hover:bg-jet-black/5"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={busy}
                          className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                        >
                          {busy ? 'Deleting…' : 'Confirm delete'}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-2 border-t border-jet-black/5 pt-3">
                        <Link
                          to={`/my-listings/${item.id}/edit`}
                          className="flex items-center gap-1.5 rounded-full border border-lavender/20 px-3 py-1.5 text-xs font-semibold text-jet-black/70 transition hover:border-lavender hover:text-deep-purple"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleTogglePause(item)}
                          disabled={busy}
                          className="flex items-center gap-1.5 rounded-full border border-lavender/20 px-3 py-1.5 text-xs font-semibold text-jet-black/70 transition hover:border-lavender hover:text-deep-purple disabled:opacity-50"
                        >
                          {item.is_available ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              Reactivate
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          disabled={busy}
                          className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
