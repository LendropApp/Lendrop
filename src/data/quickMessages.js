// Predefined quick-reply templates for in-app conversations, grouped by
// intent — the Lendrop equivalent of Clash Royale's canned battle chat.
// Kept as templates rather than free text per the product decision noted
// in supabase_setup.sql (messages table comment).
export const QUICK_MESSAGE_GROUPS = [
  {
    id: 'greeting',
    label: 'Say hi',
    messages: [
      "Hi! Looking forward to this rental 👋",
      "Thanks for approving my request!",
      "Hello! Just confirming the dates work for you.",
    ],
  },
  {
    id: 'coordination',
    label: 'Locker',
    messages: [
      "I've dropped the item off at the locker.",
      "It's ready for pickup whenever you are.",
      "Let me know once you've picked it up.",
      "Heading to the locker in a few minutes.",
    ],
  },
  {
    id: 'status',
    label: 'Status',
    messages: [
      "Everything is in great condition ✅",
      "Running a few minutes late, sorry!",
      "Could you confirm the return date?",
      "Just picked it up, all good on my end.",
    ],
  },
  {
    id: 'closing',
    label: 'Wrap up',
    messages: [
      "Thanks, see you next time!",
      "Just left you a review ⭐",
      "Let me know if you need anything else.",
      "Deposit released, thanks for taking care of it!",
    ],
  },
]
