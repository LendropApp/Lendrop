// Unfinished "publish an item" form, saved in the browser so leaving the
// page doesn't lose it (like a food-delivery app keeping your cart).
// IndexedDB instead of localStorage because it can store the picked photo
// files themselves; localStorage only holds a few MB of strings.
//
// One draft per user, on this device only. Every call fails soft: if the
// browser blocks storage (private mode, site data off) there is simply no
// draft, and publishing works exactly as before.

const DB_NAME = 'lendrop'
const STORE = 'listing_drafts'
const CHANGE_EVENT = 'lendrop:listing-draft-changed'

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run(mode, action) {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = action(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(request?.result)
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

function announce() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

// True when the form has enough in it to be worth coming back to.
export function isMeaningfulDraft(draft) {
  return Boolean(
    draft &&
      (draft.title?.trim() || draft.description?.trim() || draft.categorySlug || draft.photos?.length)
  )
}

// The publish form waits on this, so a browser that never answers must
// not leave it on "Loading…": after a short wait, carry on without a draft.
const LOAD_TIMEOUT_MS = 1500

export async function loadListingDraft(userId) {
  if (!userId) return null
  try {
    const draft = await Promise.race([
      run('readonly', (store) => store.get(userId)),
      new Promise((resolve) => setTimeout(() => resolve(null), LOAD_TIMEOUT_MS)),
    ])
    return isMeaningfulDraft(draft) ? draft : null
  } catch {
    return null
  }
}

export async function saveListingDraft(userId, draft) {
  if (!userId) return
  try {
    if (isMeaningfulDraft(draft)) {
      await run('readwrite', (store) => store.put({ ...draft, savedAt: new Date().toISOString() }, userId))
    } else {
      await run('readwrite', (store) => store.delete(userId))
    }
    announce()
  } catch {
    // No storage: the draft just won't survive leaving the page.
  }
}

export async function clearListingDraft(userId) {
  if (!userId) return
  try {
    await run('readwrite', (store) => store.delete(userId))
    announce()
  } catch {
    // Nothing stored, nothing to clear.
  }
}

// Lets a banner on another screen refresh when the draft is saved or cleared.
export function onListingDraftChange(callback) {
  window.addEventListener(CHANGE_EVENT, callback)
  return () => window.removeEventListener(CHANGE_EVENT, callback)
}
