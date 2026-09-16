import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import LockerAvatar from '../components/LockerAvatar'
import AuroraBlobs from '../components/background/AuroraBlobs'

// Mock-data-first: shaped like conversations + conversation_participants +
// messages so it drops straight onto real queries once wired up.
const MOCK_CONVERSATIONS = [
  {
    id: 'c1',
    otherUser: { full_name: 'Karla Rivas', avatar_url: null, verification_status: 'verified' },
    itemTitle: 'LEGO Millennium Falcon',
    lastMessage: "It's ready for pickup whenever you are.",
    lastMessageAt: '2026-09-16T14:20:00Z',
    unread: true,
  },
  {
    id: 'c2',
    otherUser: { full_name: 'Diego Hernández', avatar_url: null, verification_status: 'unverified' },
    itemTitle: 'Canon EOS R50',
    lastMessage: "Thanks, see you next time!",
    lastMessageAt: '2026-09-15T09:05:00Z',
    unread: false,
  },
  {
    id: 'c3',
    otherUser: { full_name: 'Andrea Portillo', avatar_url: null, verification_status: 'verified' },
    itemTitle: 'DJI Mini 4 Pro',
    lastMessage: "Running a few minutes late, sorry!",
    lastMessageAt: '2026-09-13T18:42:00Z',
    unread: false,
  },
]

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Messages() {
  return (
    <div className="min-h-screen bg-soft-white pb-16">
      <PageHeader backTo="/profile" backLabel="Back to Profile" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-3xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-jet-black">Messages</h1>
          <p className="mt-1 text-sm text-jet-black/50">
            Coordinate pickups and drop-offs with quick replies — no need to type it all out.
          </p>

          {MOCK_CONVERSATIONS.length > 0 ? (
            <div className="mt-6 divide-y divide-jet-black/5 overflow-hidden rounded-2xl border border-lavender/15 bg-white">
              {MOCK_CONVERSATIONS.map((c) => (
                <Link
                  key={c.id}
                  to={`/messages/${c.id}`}
                  className="flex items-center gap-3 p-4 transition hover:bg-lavender/5"
                >
                  <LockerAvatar
                    label={c.otherUser.full_name}
                    photoUrl={c.otherUser.avatar_url}
                    verified={c.otherUser.verification_status === 'verified'}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-jet-black">{c.otherUser.full_name}</p>
                      <span className="shrink-0 text-xs text-jet-black/40">{timeAgo(c.lastMessageAt)}</span>
                    </div>
                    <p className="truncate text-xs text-jet-black/45">{c.itemTitle}</p>
                    <p className={`mt-0.5 truncate text-sm ${c.unread ? 'font-semibold text-jet-black' : 'text-jet-black/55'}`}>
                      {c.lastMessage}
                    </p>
                  </div>
                  {c.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-deep-purple" />}
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-16 flex flex-col items-center gap-2 text-center">
              <MessageCircle className="h-8 w-8 text-jet-black/20" />
              <p className="font-display text-lg font-semibold text-jet-black">No conversations yet</p>
              <p className="text-sm text-jet-black/50">
                Reserve or list an item to start coordinating a handoff.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
