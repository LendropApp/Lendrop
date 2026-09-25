import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Package, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import LockerAvatar from '../components/LockerAvatar'

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Messages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false

    supabase
      .from('conversations')
      .select(`
        id, created_at,
        item:items(id, title),
        participants:conversation_participants(user:profiles(id, full_name, avatar_url, verification_status)),
        messages(id, body, sender_id, created_at)
      `)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setError('Could not load your conversations. Please refresh.')
        } else {
          setConversations(data ?? [])
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  // Latest activity first: a conversation you just replied in belongs at
  // the top, not wherever it was created.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return conversations
      .map((c) => {
        const other = c.participants?.map((p) => p.user).find((u) => u?.id !== user?.id)
        const last = [...(c.messages ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        return { ...c, other, last, activity: last?.created_at ?? c.created_at }
      })
      .filter((c) => !q || `${c.other?.full_name ?? ''} ${c.item?.title ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.activity) - new Date(a.activity))
  }, [conversations, query, user])

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/explore" backLabel="Explore" />

      <div className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Messages</h1>
        <p className="mt-2 text-sm text-text-muted">Coordinate drop-offs and pickups with quick replies.</p>

        {error ? (
          <p role="alert" className="py-20 text-center text-sm text-danger">{error}</p>
        ) : loading ? (
          <p className="py-20 text-center text-sm text-text-muted">Loading conversations…</p>
        ) : conversations.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-6 py-14 text-center">
            <MessageCircle className="h-8 w-8 text-text-muted" aria-hidden="true" />
            <p className="text-xl font-bold">No conversations yet</p>
            <p className="max-w-sm text-sm text-text-muted">
              Tap “Message” on a listing to start coordinating a handoff with its owner.
            </p>
            <Link to="/explore" className="cta-brand mt-4 rounded-xl px-6 py-2.5 text-sm font-bold text-soft-white">
              Browse items
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 focus-within:border-primary">
              <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
              <label htmlFor="messages-search" className="sr-only">
                Search conversations
              </label>
              <input
                id="messages-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or item"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            {rows.length === 0 ? (
              <p className="py-14 text-center text-sm text-text-muted">No conversations match “{query}”.</p>
            ) : (
              <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
                {rows.map((c, index) => {
                  const mine = c.last?.sender_id === user.id
                  return (
                    <li key={c.id} className={index > 0 ? 'border-t border-border' : ''}>
                      <Link to={`/messages/${c.id}`} className="flex items-start gap-3 p-4 hover:bg-surface-raised">
                        <LockerAvatar
                          label={c.other?.full_name}
                          photoUrl={c.other?.avatar_url}
                          verified={c.other?.verification_status === 'verified'}
                          size="md"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-bold text-text">{c.other?.full_name ?? 'Lendrop user'}</span>
                            <span className="shrink-0 text-xs text-text-muted">{timeAgo(c.activity)}</span>
                          </span>
                          {c.item?.title && (
                            <span className="mt-0.5 flex items-center gap-1 truncate text-xs font-semibold text-primary">
                              <Package className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">{c.item.title}</span>
                            </span>
                          )}
                          <span className="mt-1 block truncate text-sm text-text-muted">
                            {c.last ? (
                              <>
                                {mine && <span className="font-semibold text-text">You: </span>}
                                {c.last.body}
                              </>
                            ) : (
                              'No messages yet. Say hi!'
                            )}
                          </span>
                        </span>
                      </Link>
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
