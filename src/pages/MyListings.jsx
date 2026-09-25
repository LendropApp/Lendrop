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

// is_available doubles as the published/paused switch: a paused listing
// still exists and stays editable, it just drops out of Explore and out
// of the reservation RPCs, which only pick up available items.
const STATUS_META = {
  active: { label: 'Active', className: 'bg-success-soft text-success' },
  paused: { label: 'Paused', className: 'bg-surface-raised text-primary' },
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
  const [filter, setFilter] = useState('all')

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

  const activeCount = items.filter((i) => i.is_available).length
  const pausedCount = items.length - activeCount
  const visible = items.filter((i) => (filter === 'active' ? i.is_available : filter === 'paused' ? !i.is_available : true))
  const FILTERS = [
    { id: 'all', label: 'All', count: items.length },
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'paused', label: 'Paused', count: pausedCount },
  ]

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/profile" backLabel="Profile" maxWidth="max-w-5xl" />

      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">My listings</h1>
            {!loading && !error && items.length > 0 && (
              <p className="mt-2 text-sm text-text-muted">
                <span className="num text-lg text-text">{activeCount}</span> live in Explore ·{' '}
                <span className="num text-lg text-text">{pausedCount}</span> paused
              </p>
            )}
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handlePublishClick}
              className="cta-brand flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-soft-white"
            >
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
              New listing
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <StatusMessage type={status.type} text={status.text} />
          {!isVerified && <VerificationNotice status={verificationStatus} action="publish" />}
        </div>

        {error ? (
          <p role="alert" className="py-20 text-center text-sm text-danger">{error}</p>
        ) : loading ? (
          <p className="py-20 text-center text-sm text-text-muted">Loading your listings…</p>
        ) : items.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised">
              <PackagePlus className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <p className="mt-4 text-xl font-bold">You haven't listed anything yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
              {isVerified
                ? 'Put that camera, drill or tent to work. Listing takes a couple of minutes.'
                : 'Verify your identity and you can list your first item in a couple of minutes.'}
            </p>
            <button
              type="button"
              onClick={handlePublishClick}
              className="cta-brand mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-soft-white"
            >
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
              {isVerified ? 'Publish your first item' : 'Verify to start listing'}
            </button>
          </section>
        ) : (
          <>
            <div className="mt-6 flex gap-1 rounded-xl border border-border bg-surface-raised p-1 sm:inline-flex" role="group" aria-label="Filter listings">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`flex-1 rounded-lg px-4 py-1.5 text-sm font-semibold sm:flex-none ${
                    filter === f.id ? 'stamp' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {f.label} <span className="tabular-nums">{f.count}</span>
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className="py-16 text-center text-sm text-text-muted">
                No {filter} listings right now.
              </p>
            ) : (
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((item) => {
                  const cover = [...(item.photos ?? [])].sort((a, b) => a.display_order - b.display_order)[0]
                  const meta = item.is_available ? STATUS_META.active : STATUS_META.paused
                  const CategoryIcon = getCategoryIcon(item.category?.slug)
                  const busy = busyId === item.id

                  return (
                    <li key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
                      <Link to={`/item/${item.id}`} className="relative block aspect-4/3 bg-surface-raised">
                        {cover && (
                          <img
                            src={getItemPhotoUrl(cover.storage_path)}
                            alt=""
                            className={`h-full w-full object-cover ${item.is_available ? '' : 'opacity-50 grayscale'}`}
                          />
                        )}
                        <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-semibold ${meta.className}`}>
                          {meta.label}
                        </span>
                        {!item.required_locker_size && (
                          <span
                            title="This item doesn't fit in any of our lockers yet. Fix its measurements in Edit."
                            className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger"
                          >
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            Too large
                          </span>
                        )}
                      </Link>

                      <div className="flex flex-1 flex-col p-4">
                        <Link to={`/item/${item.id}`} className="truncate font-bold text-text hover:text-primary">
                          {item.title}
                        </Link>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                          <CategoryIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          {item.category?.name ?? 'Uncategorised'}
                        </p>
                        <p className="mt-2 text-text">
                          <span className="num text-2xl">${Number(item.price_per_day).toFixed(2)}</span>
                          <span className="text-sm text-text-muted"> / day</span>
                        </p>

                        {confirmDeleteId === item.id ? (
                          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
                            <p className="w-full text-xs text-text-muted">Delete this listing for good?</p>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={busy}
                              className="cta-outline rounded-lg px-3 py-1 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              disabled={busy}
                              className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                            >
                              {busy ? 'Deleting…' : 'Confirm delete'}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
                            <Link
                              to={`/my-listings/${item.id}/edit`}
                              className="cta-outline flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleTogglePause(item)}
                              disabled={busy}
                              className="cta-outline flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50"
                            >
                              {item.is_available ? (
                                <>
                                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                  Reactivate
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              disabled={busy}
                              aria-label={`Delete ${item.title}`}
                              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-danger-soft"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
