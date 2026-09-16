import { useState } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import LockerAvatar from '../components/LockerAvatar'
import { QUICK_MESSAGE_GROUPS } from '../data/quickMessages'

const MOCK_THREADS = {
  c1: {
    otherUser: { full_name: 'Karla Rivas', avatar_url: null, verification_status: 'verified' },
    itemTitle: 'LEGO Millennium Falcon',
    messages: [
      { id: 'm1', mine: false, body: 'Hi! Looking forward to this rental 👋', at: '2026-09-16T13:00:00Z' },
      { id: 'm2', mine: true, body: "Hello! Just confirming the dates work for you.", at: '2026-09-16T13:05:00Z' },
      { id: 'm3', mine: false, body: "It's ready for pickup whenever you are.", at: '2026-09-16T14:20:00Z' },
    ],
  },
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Conversation() {
  const { conversationId } = useParams()
  const thread = MOCK_THREADS[conversationId] ?? MOCK_THREADS.c1
  const [messages, setMessages] = useState(thread.messages)
  const [activeGroup, setActiveGroup] = useState(QUICK_MESSAGE_GROUPS[0].id)

  function sendQuickMessage(body) {
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, mine: true, body, at: new Date().toISOString() }])
  }

  const group = QUICK_MESSAGE_GROUPS.find((g) => g.id === activeGroup) ?? QUICK_MESSAGE_GROUPS[0]

  return (
    <div className="flex min-h-screen flex-col bg-soft-white">
      <PageHeader
        backTo="/messages"
        backLabel="Messages"
        right={
          <LockerAvatar
            label={thread.otherUser.full_name}
            photoUrl={thread.otherUser.avatar_url}
            verified={thread.otherUser.verification_status === 'verified'}
            size="sm"
          />
        }
      />

      <div className="border-b border-jet-black/5 bg-white px-6 py-3 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-jet-black">{thread.otherUser.full_name}</p>
          <p className="text-xs text-jet-black/45">About: {thread.itemTitle}</p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-6 py-6 sm:px-10">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                m.mine
                  ? 'bg-deep-purple text-white'
                  : 'border border-jet-black/10 bg-white text-jet-black'
              }`}
            >
              <p>{m.body}</p>
              <p className={`mt-1 text-[10px] ${m.mine ? 'text-white/60' : 'text-jet-black/35'}`}>
                {formatTime(m.at)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 border-t border-jet-black/5 bg-white px-6 py-4 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs font-medium text-jet-black/45">
            Quick replies — free text isn't available yet, tap a message to send it.
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
                onClick={() => sendQuickMessage(msg)}
                className="rounded-full border border-lavender/30 bg-lavender/10 px-3.5 py-2 text-sm text-deep-purple transition hover:border-lavender hover:bg-lavender/20"
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
