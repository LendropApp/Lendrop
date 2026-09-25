import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/explore" backLabel="Back to Explore" />

      <div className="relative isolate overflow-hidden">
        <div className="relative mx-auto max-w-3xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-text">Messages</h1>
          <p className="mt-1 text-sm text-text-muted">
            Coordinate pickups and drop offs with quick replies, no need to type it all out.
          </p>

          {error ? (
            <p className="py-20 text-center text-sm text-red-600">{error}</p>
          ) : loading ? (
            <p className="py-20 text-center text-sm text-text-muted">Loading conversations…</p>
          ) : conversations.length > 0 ? (
            <div className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {conversations.map((c) => {
                const other = c.participants?.map((p) => p.user).find((u) => u?.id !== user.id)
                const lastMessage = [...(c.messages ?? [])].sort(
                  (a, b) => new Date(b.created_at) - new Date(a.created_at)
                )[0]

                return (
                  <Link
                    key={c.id}
                    to={`/messages/${c.id}`}
                    className="flex items-center gap-3 p-4 transition hover:bg-surface-raised"
                  >
                    <LockerAvatar
                      label={other?.full_name}
                      photoUrl={other?.avatar_url}
                      verified={other?.verification_status === 'verified'}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-text">
                          {other?.full_name ?? 'Lendrop user'}
                        </p>
                        {lastMessage && (
                          <span className="shrink-0 text-xs text-text-muted">{timeAgo(lastMessage.created_at)}</span>
                        )}
                      </div>
                      {c.item?.title && <p className="truncate text-xs text-text-muted">{c.item.title}</p>}
                      <p className="mt-0.5 truncate text-sm text-text-muted">
                        {lastMessage?.body ?? 'No messages yet, say hi!'}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="mt-16 flex flex-col items-center gap-2 text-center">
              <MessageCircle className="h-8 w-8 text-text-muted" />
              <p className="font-display text-lg font-semibold text-text">No conversations yet</p>
              <p className="text-sm text-text-muted">
                Tap "Message" on a listing to start coordinating a handoff with its lender.
              </p>
              <Link to="/explore" className="mt-2 text-sm font-semibold text-primary hover:underline">
                Browse Explore
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
