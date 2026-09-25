import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, Package, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import LockerAvatar from '../components/LockerAvatar'
import { QUICK_MESSAGE_GROUPS } from '../data/quickMessages'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(iso) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Conversation() {
  const { conversationId } = useParams()
  const { user } = useAuth()

  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [activeGroup, setActiveGroup] = useState(QUICK_MESSAGE_GROUPS[0].id)
  const endRef = useRef(null)

  const loadConversation = useCallback(async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        item:items(id, title),
        participants:conversation_participants(user:profiles(id, full_name, avatar_url, verification_status)),
        messages(id, body, sender_id, created_at)
      `)
      .eq('id', conversationId)
      .maybeSingle()

    if (error || !data) {
      setError('Could not load this conversation.')
    } else {
      setConversation(data)
      setMessages([...(data.messages ?? [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
    }
    setLoading(false)
  }, [conversationId])

  useEffect(() => {
    loadConversation()
  }, [loadConversation])

  // Keep the newest message in view, on open and after sending.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  async function sendQuickMessage(body) {
    if (sending) return
    setSending(true)
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, body })
      .select('id, body, sender_id, created_at')
      .single()
    setSending(false)
    if (!error && data) {
      setMessages((prev) => [...prev, data])
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-text-muted">Loading conversation…</p>
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <p role="alert" className="text-sm text-danger">{error || 'Conversation not found.'}</p>
        <Link to="/messages" className="cta-outline rounded-xl px-5 py-2 text-sm font-semibold">
          Back to messages
        </Link>
      </div>
    )
  }

  const other = conversation.participants?.map((p) => p.user).find((u) => u?.id !== user.id)
  const verified = other?.verification_status === 'verified'
  const group = QUICK_MESSAGE_GROUPS.find((g) => g.id === activeGroup) ?? QUICK_MESSAGE_GROUPS[0]

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <PageHeader backTo="/messages" backLabel="Messages" />

      {/* Who you're talking to, and about what */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-6 py-4 sm:px-10">
          <LockerAvatar label={other?.full_name} photoUrl={other?.avatar_url} verified={verified} size="md" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-bold">
              {other?.full_name ?? 'Lendrop user'}
              {verified && <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified" />}
            </p>
            <p className="text-xs text-text-muted">Handoffs happen at a Lendrop locker</p>
          </div>
          {conversation.item && (
            <Link
              to={`/item/${conversation.item.id}`}
              className="flex max-w-full items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm hover:border-primary sm:max-w-[16rem]"
            >
              <Package className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate font-semibold">{conversation.item.title}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-6 sm:px-10" role="log" aria-label="Messages">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">No messages yet. Send a quick reply to say hi.</p>
        ) : (
          <ol className="space-y-2">
            {messages.map((m, index) => {
              const mine = m.sender_id === user.id
              const newDay = index === 0 || dayLabel(messages[index - 1].created_at) !== dayLabel(m.created_at)
              return (
                <li key={m.id}>
                  {newDay && (
                    <p className="my-4 text-center text-xs font-semibold text-text-muted">{dayLabel(m.created_at)}</p>
                  )}
                  <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                        mine ? 'rounded-br-md bg-cta text-soft-white' : 'rounded-bl-md border border-border bg-surface text-text'
                      }`}
                    >
                      <p>{m.body}</p>
                      <p className={`mt-1 text-right text-xs tabular-nums ${mine ? 'text-soft-white/75' : 'text-text-muted'}`}>
                        {formatTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-surface px-6 py-4 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs text-text-muted">Tap a quick reply to send it. Free text isn't available yet.</p>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Reply topics">
            {QUICK_MESSAGE_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroup(g.id)}
                aria-pressed={g.id === activeGroup}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  g.id === activeGroup ? 'stamp' : 'border border-border bg-surface text-text-muted hover:text-text'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {group.messages.map((msg) => (
              <button
                key={msg}
                type="button"
                disabled={sending}
                onClick={() => sendQuickMessage(msg)}
                className="cta-outline rounded-xl px-3.5 py-1.5 text-left text-sm font-medium disabled:opacity-50"
              >
                {msg}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
