import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import LockerAvatar from '../components/LockerAvatar'
import { QUICK_MESSAGE_GROUPS } from '../data/quickMessages'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-bg text-center">
        <p className="text-sm text-danger">{error || 'Conversation not found.'}</p>
      </div>
    )
  }

  const other = conversation.participants?.map((p) => p.user).find((u) => u?.id !== user.id)
  const group = QUICK_MESSAGE_GROUPS.find((g) => g.id === activeGroup) ?? QUICK_MESSAGE_GROUPS[0]

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <PageHeader
        backTo="/messages"
        backLabel="Messages"
        right={
          <LockerAvatar
            label={other?.full_name}
            photoUrl={other?.avatar_url}
            verified={other?.verification_status === 'verified'}
            size="sm"
          />
        }
      />

      <div className="border-b border-border bg-surface px-6 py-3 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-text">{other?.full_name ?? 'Lendrop user'}</p>
          {conversation.item?.title && (
            <p className="text-xs text-text-muted">About: {conversation.item.title}</p>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-6 py-6 sm:px-10">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">
            No messages yet. Send a quick reply to say hi.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.sender_id === user.id
                    ? 'bg-cta text-soft-white'
                    : 'border border-border bg-surface text-text'
                }`}
              >
                <p>{m.body}</p>
                <p className={`mt-1 text-xs ${m.sender_id === user.id ? 'text-soft-white/75' : 'text-text-muted'}`}>
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-surface px-6 py-4 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs font-medium text-text-muted">
            Quick replies. Free text isn't available yet, tap a message to send it.
          </p>
          <div className="mb-3 flex gap-2 overflow-x-auto">
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
                className="cta-outline rounded-xl px-3.5 py-1.5 text-sm font-medium disabled:opacity-50"
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
