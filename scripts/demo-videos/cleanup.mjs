// Removes the demo account's photos from the item-photos bucket.
//
//   node cleanup.mjs
//
// Storage objects can't be deleted with SQL, only through the Storage API,
// and the bucket policy lets each owner delete their own folder. So this
// signs in as the disposable account and empties it. Run it before the SQL
// cleanup in README.md, which deletes the account itself.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { REPO, readDemoEnv } from './lib/director.mjs'

const appEnv = Object.fromEntries(
  readFileSync(join(REPO, '.env'), 'utf8').split(/\r?\n/).filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const env = readDemoEnv()
const supabase = createClient(appEnv.VITE_SUPABASE_URL, appEnv.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
})

const { data: auth, error: signInError } = await supabase.auth.signInWithPassword({
  email: env.DEMO_EMAIL,
  password: env.DEMO_PASSWORD,
})
if (signInError) throw new Error(`sign-in failed: ${signInError.message}`)
const uid = auth.user.id

// <uid>/<item id>/<photo>.jpg: list the item folders, then their files.
const bucket = supabase.storage.from('item-photos')
const { data: folders, error: listError } = await bucket.list(uid, { limit: 1000 })
if (listError) throw new Error(`could not list ${uid}/: ${listError.message}`)

const paths = []
for (const folder of folders) {
  const { data: files, error } = await bucket.list(`${uid}/${folder.name}`, { limit: 1000 })
  if (error) throw new Error(`could not list ${uid}/${folder.name}: ${error.message}`)
  paths.push(...files.map((f) => `${uid}/${folder.name}/${f.name}`))
}

if (paths.length) {
  const { data: removed, error } = await bucket.remove(paths)
  if (error) throw new Error(`could not remove photos: ${error.message}`)
  console.log(`Removed ${removed.length} photo(s) from item-photos/${uid}/`)
} else {
  console.log(`Nothing in item-photos/${uid}/`)
}
await supabase.auth.signOut()
