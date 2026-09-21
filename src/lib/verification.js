// Copy for the "you must verify your identity first" rule, kept in one
// place so the publish screen, the item page and /verification all say
// the same thing about the same state.
//
// The three blocked states are deliberately distinct: "pending" is not a
// failure (nothing to do but wait), "rejected" needs the user to act
// again, "unverified" has simply never started.

export const VERIFICATION_ACTIONS = {
  publish: 'publish an item',
  rent: 'book a rental',
}

const COPY = {
  unverified: {
    label: 'Not verified',
    tone: 'neutral',
    title: 'Verify your identity first',
    body: (action) =>
      `Lendrop needs to confirm who you are before you can ${VERIFICATION_ACTIONS[action]}. It takes a photo of your DUI and a selfie.`,
    cta: 'Verify my identity',
  },
  pending: {
    label: 'Under review',
    tone: 'pending',
    title: 'Your documents are under review',
    body: (action) =>
      `We're still checking your ID. As soon as it's approved you'll be able to ${VERIFICATION_ACTIONS[action]} — reviews usually take less than 24 hours.`,
    cta: 'Check status',
  },
  rejected: {
    label: 'Needs attention',
    tone: 'error',
    title: "We couldn't verify your identity",
    body: (action) =>
      `Your last submission was rejected, so you can't ${VERIFICATION_ACTIONS[action]} yet. Send a clearer photo of your DUI to try again.`,
    cta: 'Try again',
  },
}

export function describeVerification(status, action = 'publish') {
  const entry = COPY[status] ?? COPY.unverified
  return {
    status: COPY[status] ? status : 'unverified',
    label: entry.label,
    tone: entry.tone,
    title: entry.title,
    body: entry.body(VERIFICATION_ACTIONS[action] ? action : 'publish'),
    cta: entry.cta,
  }
}

// The server raises this exact message from the reservation RPCs, and
// the RLS policies reject the insert with 42501 — both mean the same
// thing to the user, so map them to one error state.
export function isVerificationError(error) {
  if (!error) return false
  return (
    error.message?.includes('IDENTITY_NOT_VERIFIED') ||
    error.code === '42501' ||
    error.code === 'PGRST301'
  )
}
