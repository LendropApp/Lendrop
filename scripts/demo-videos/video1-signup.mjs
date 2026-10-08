// VIDEO 1 · Sign-up + Lendrop ID (~6 s)
//
//   node video1-signup.mjs                # full video
//   node video1-signup.mjs --signup-only  # just the form (no account needed)
//
// Needs `npm run build && npm run preview` at the repo root and scripts/demo-videos/.env.demo.
//
// The sign-up request is answered by a mock instead of reaching Supabase:
// a real signUp() would email a confirmation link to the demo address. The
// account the second half signs into is a disposable one created ahead of
// time (see README.md) and deleted after filming.

import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { Director, HERE, readDemoEnv } from './lib/director.mjs'
import { encode, contactSheet } from './lib/encode.mjs'

const signupOnly = process.argv.includes('--signup-only')
const env = readDemoEnv()
const OUT = join(HERE, 'out')
mkdirSync(OUT, { recursive: true })

// Target lengths in the final cut (seconds).
const FORM_SECONDS = 1.0 // filling the form, sped up
const NAV_MAX_SECONDS = 0.9 // avatar → profile
const ID_HOLD_SECONDS = 1.5

const signupMock = {
  method: 'POST',
  path: '/auth/v1/signup',
  // Long enough that the cut lands on "Creating account…", not on the
  // "Check your email" card (frames take far longer than 1/30 s to shoot).
  delayMs: 8000,
  // What GoTrue answers when the address still has to be confirmed.
  body: (req) => {
    const { email, data } = req.postDataJSON()
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    return {
      id, aud: 'authenticated', role: '', email, phone: '',
      confirmation_sent_at: now, created_at: now, updated_at: now, is_anonymous: false,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: data,
      identities: [{ id, user_id: id, provider: 'email', identity_data: { sub: id, email }, created_at: now }],
    }
  },
}

const d = await Director.launch({ name: 'video1', mocks: [signupMock] })
const { page } = d

try {
  // ── Part A: the sign-up form ──────────────────────────────────────────
  await d.goto('/signup', { ready: '#fullName' })
  await d.startRecording()
  await d.showCursor()
  await d.wait(250)

  d.mark('formStart')
  await d.click('#fullName')
  await d.type(env.DEMO_FULL_NAME)
  await d.click('#email')
  await d.type(env.DEMO_EMAIL)
  await d.click('#dui')
  await d.type(env.DEMO_DUI.replace('-', '')) // the field adds the dash itself
  // A date input is three segments (dd/mm/yyyy with --lang=en-GB); aim at
  // the first one so typing fills day, month, year in order.
  const dob = await page.locator('#dateOfBirth').boundingBox()
  await d.click({ x: dob.x + 30, y: dob.y + dob.height / 2 })
  const [y, m, day] = env.DEMO_DOB.split('-')
  await d.type(`${day}${m}${y}`)
  await d.click('#password')
  await d.type(env.DEMO_PASSWORD)
  await d.click('#confirmPassword')
  await d.type(env.DEMO_PASSWORD)
  await d.click('form input[type="checkbox"]')
  await d.moveTo('form button[type="submit"]')
  d.mark('formEnd')
  const filled = await page.evaluate(() => ({
    dui: document.querySelector('#dui')?.value,
    dob: document.querySelector('#dateOfBirth')?.value,
  }))
  console.log('  form:', filled)


  // The big click plays at real speed.
  d.mark('ctaStart')
  await d.click(null, { dwell: 80, after: 380 })
  d.mark('ctaEnd')

  if (!signupOnly) {
    // ── Off camera: sign in to the disposable account ───────────────────
    // goto() lets time run again; nothing is filmed until startRecording().
    await page.evaluate(() => window.__demo.hide())
    await d.signIn(env.DEMO_EMAIL, env.DEMO_PASSWORD)
    await d.goto('/explore', { ready: 'a[href^="/item/"]', settleMs: 1500 })
    await d.waitForImages()
    await d.startRecording()
    await d.showCursor()
    await d.wait(120)

    // ── Part B: avatar → profile ────────────────────────────────────────
    d.mark('navStart')
    await d.click('[aria-label="Your account"]', { after: 0 })
    const card = 'section[aria-labelledby="lendrop-id-title"]'
    const showBtn = `${card} button:has-text("Show")`
    await d.stepUntil(showBtn)
    await d.wait(150)
    d.mark('navEnd')

    // ── Part C: zoom on the Lendrop ID, reveal it ───────────────────────
    d.mark('zoomStart')
    // The cursor heads for where the Show button will be once zoomed.
    const zoomScale = 1.7
    const cardBox = await d.centerOf(card)
    const btn = await d.centerOf(showBtn)
    const origin = await page.evaluate(([c, s]) => {
      window.__demo.zoom(c, s)
      const root = document.getElementById('root')
      const r = root.getBoundingClientRect()
      const [ox, oy] = getComputedStyle(root).transformOrigin.split(' ').map(parseFloat)
      return { x: ox + r.left, y: oy + r.top }
    }, [cardBox, zoomScale])
    const btnZoomed = {
      x: origin.x + zoomScale * (btn.x - origin.x),
      y: origin.y + zoomScale * (btn.y - origin.y),
    }
    await d.wait(200)
    await d.moveTo(btnZoomed, 500)
    await d.click(null, { dwell: 60, after: 0 })
    d.mark('revealed')
    await d.wait(ID_HOLD_SECONDS * 1000 + 100)
    d.mark('idEnd')
    const code = await page.locator(`${card} .locker-code`).textContent()
    console.log('  Lendrop ID on screen:', code?.trim())
  }

  const timeline = await d.stopRecording()
  if (d.blocked.length) throw new Error(`the page tried to write: ${d.blocked.join(', ')}`)

  const segments = [
    { from: 'formStart', to: 'formEnd', fit: FORM_SECONDS },
    { from: 'ctaStart', to: 'ctaEnd' },
  ]
  if (!signupOnly) {
    segments.push(
      { from: 'navStart', to: 'navEnd', max: NAV_MAX_SECONDS },
      { from: 'zoomStart', to: 'idEnd' },
    )
  }
  console.log(`  ${timeline.frames} frames filmed`)

  const out = join(OUT, signupOnly ? 'video1_signup_only.mp4' : 'video1_registro_lendrop_id.mp4')
  const { planned, probe } = encode({ timeline, segments, out })
  console.log(`  ✓ ${out}\n    ${probe.seconds?.toFixed(2)} s (planned ${planned.toFixed(2)} s) · ${probe.stream}`)
  mkdirSync(join(OUT, 'review'), { recursive: true })
  contactSheet(out, join(OUT, 'review', signupOnly ? 'v1a_sheet.png' : 'v1_sheet.png'))
} finally {
  await d.close()
}
