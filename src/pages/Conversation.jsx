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
      <div className="flex min-h-screen items-center justify-center bg-soft-white">
        <p className="text-sm text-jet-black/50">Loading conversation…</p>
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-soft-white text-center">
        <p className="text-sm text-red-600">{error || 'Conversation not found.'}</p>
      </div>
    )
  }

  const other = conversation.participants?.map((p) => p.user).find((u) => u?.id !== user.id)
  const group = QUICK_MESSAGE_GROUPS.find((g) => g.id === activeGroup) ?? QUICK_MESSAGE_GROUPS[0]

  return (
    <div className="flex min-h-screen flex-col bg-soft-white">
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

      <div className="border-b border-jet-black/5 bg-white px-6 py-3 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-jet-black">{other?.full_name ?? 'Lendrop user'}</p>
          {conversation.item?.title && (
            <p className="text-xs text-jet-black/45">About: {conversation.item.title}</p>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-6 py-6 sm:px-10">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-jet-black/40">
            No messages yet. Send a quick reply to say hi.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.sender_id === user.id
                    ? 'bg-deep-purple text-white'
                    : 'border border-jet-black/10 bg-white text-jet-black'
                }`}
              >
                <p>{m.body}</p>
                <p className={`mt-1 text-[10px] ${m.sender_id === user.id ? 'text-white/60' : 'text-jet-black/35'}`}>
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sticky bottom-0 border-t border-jet-black/5 bg-white px-6 py-4 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs font-medium text-jet-black/45">
            Quick replies. Free text isn't available yet, tap a message to send it.
          </p>
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {QUICK_MESSAGE_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroup(g.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  g.id === activeGroup
                    ? 'bg-deep-purple text-white'
                    : 'bg-jet-black/5 text-jet-black/60 hover:bg-lavender/15'
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
                className="rounded-full border border-lavender/30 bg-lavender/10 px-3.5 py-2 text-sm text-deep-purple transition hover:border-lavender hover:bg-lavender/20 disabled:opacity-50"
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
