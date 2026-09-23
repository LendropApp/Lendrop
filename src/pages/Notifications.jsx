import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Bell, Calendar, DollarSign, MessageCircle, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import AuroraBlobs from '../components/background/AuroraBlobs'

const TYPE_ICON = {
  reservation: Calendar,
  payment: DollarSign,
  message: MessageCircle,
  review: Star,
  dispute: AlertTriangle,
  system: Bell,
}

function destinationFor(n) {
  switch (n.type) {
    case 'message':
      return n.related_id ? `/messages/${n.related_id}` : null
    case 'review':
      return n.related_id ? `/item/${n.related_id}` : null
    case 'reservation':
    case 'payment':
    case 'dispute':
      return '/history'
    default:
      return null
  }
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [{ data, error }, { data: prefs }] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, type, title, body, related_id, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_preferences')
        .select('notify_messages, notify_reservations, notify_reviews')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    if (error) {
      setError('Could not load your notifications. Please refresh.')
    } else {
      // Disputes and system alerts are safety-critical and always shown,
      // even if someone muted messages/reservations/reviews in Settings.
      const mutedTypes = new Set()
      if (prefs?.notify_messages === false) mutedTypes.add('message')
      if (prefs?.notify_reservations === false) {
        mutedTypes.add('reservation')
        mutedTypes.add('payment')
      }
      if (prefs?.notify_reviews === false) mutedTypes.add('review')

      setNotifications((data ?? []).filter((n) => !mutedTypes.has(n.type)))
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  async function handleOpen(n) {
    if (!n.is_read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
    }
    const dest = destinationFor(n)
    if (dest) navigate(dest)
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/explore" backLabel="Back to Explore" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-3xl px-6 py-8 sm:px-10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-text">Notifications</h1>
              <p className="mt-1 text-sm text-text-muted">
                Messages, reviews, and reservation updates land here.
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="shrink-0 text-sm font-semibold text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {error ? (
            <p className="py-20 text-center text-sm text-red-600">{error}</p>
          ) : loading ? (
            <p className="py-20 text-center text-sm text-text-muted">Loading notifications…</p>
          ) : notifications.length > 0 ? (
            <div className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {notifications.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Bell
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleOpen(n)}
                    className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-surface-raised ${
                      n.is_read ? '' : 'bg-lavender/[0.04]'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm ${n.is_read ? 'font-medium text-text-muted' : 'font-semibold text-text'}`}>
                          {n.title}
                        </p>
                        <span className="shrink-0 text-xs text-text-muted">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.body && <p className="mt-0.5 truncate text-sm text-text-muted">{n.body}</p>}
                    </div>
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="mt-16 flex flex-col items-center gap-2 text-center">
              <Bell className="h-8 w-8 text-text-muted" />
              <p className="font-display text-lg font-semibold text-text">You're all caught up</p>
              <p className="text-sm text-text-muted">
                New messages, reviews, and reservation updates will show up here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
