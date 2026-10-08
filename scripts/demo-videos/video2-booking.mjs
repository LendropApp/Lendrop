// VIDEO 2 · Search, pick dates and pay (~10 s)
//
//   node video2-booking.mjs
//
// Needs `npm run build && npm run preview` at the repo root, the disposable renter in .env.demo
// (verified, so she can rent) and the demo host's "Coleman camping tent"
// listing (see README.md).
//
// This one writes for real: create_checkout opens a pending reservation and
// payment, and the payments-checkout function charges it in Wompi's mock
// mode and assigns a locker compartment. No real card or money is involved,
// and the cleanup in README.md removes all of it.

import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { Director, HERE, readDemoEnv } from './lib/director.mjs'
import { encode, contactSheet } from './lib/encode.mjs'

const env = readDemoEnv()
const OUT = join(HERE, 'out')
mkdirSync(join(OUT, 'review'), { recursive: true })

const ITEM_TITLE = 'Coleman camping tent'
const CARD = { holder: env.DEMO_FULL_NAME, number: '4242424242424242', expiry: '0829', cvc: '123' } // Wompi's test "approved" card
const LOCKER_HOLD_SECONDS = 1.3

// The coming weekend (Saturday + Sunday), at least a day out.
function nextWeekend() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1)
  const sun = new Date(d)
  sun.setDate(d.getDate() + 1)
  return [d, sun]
}

const d = await Director.launch({
  name: 'video2',
  allowWrites: ['/rest/v1/rpc/create_checkout', '/functions/v1/payments-checkout'],
})
const { page } = d

try {
  await d.signIn(env.DEMO_EMAIL, env.DEMO_PASSWORD)
  await d.goto('/explore', { ready: 'a[href^="/item/"]', settleMs: 1500 })
  await d.waitForImages()
  const search = 'input[placeholder^="Search cameras"]'
  const card = `a[href^="/item/"]:has-text("${ITEM_TITLE}")`

  await d.startRecording()
  await d.showCursor()
  d.mark('open')
  await d.wait(150)

  // ── 1. Search ─────────────────────────────────────────────────────────
  await d.click(search, { after: 60 })
  d.mark('typeStart')
  await d.type('camping tent')
  d.mark('typeEnd')
  await d.wait(350)

  // ── 2. Pick the listing ───────────────────────────────────────────────
  await d.click(card, { after: 0 })
  d.mark('itemLoading')
  await d.stepUntil('button:has-text("Pick dates to rent")')
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 })
  await d.wait(100)
  d.mark('itemReady')
  await d.wait(250)

  // ── 3. Dates: the coming weekend ──────────────────────────────────────
  await d.click('button:has-text("Pick dates to rent")', { after: 150 })
  const [sat, sun] = nextWeekend()
  if (sat.getMonth() !== new Date().getMonth()) await d.click('[aria-label="Next month"]', { after: 200 })
  const day = (date) => page.locator('button[aria-pressed]').filter({ hasText: new RegExp(`^${date.getDate()}$`) })
  await d.ensureVisible('[aria-label="Next month"]', { margin: 60 })
  await d.click(await boxCenter(day(sat)), { after: 120 })
  await d.click(await boxCenter(day(sun)), { after: 0 })
  d.mark('datesPicked')
  await d.stepUntil('button:has-text("Continue to payment"):not([disabled])')
  d.mark('breakdownReady')
  await d.wait(300)

  // ── 4. Continue to payment → summary ──────────────────────────────────
  await d.ensureVisible('button:has-text("Continue to payment")', { margin: 80 })
  await d.syncClock() // the 15:00 pay countdown runs against server time
  await d.click('button:has-text("Continue to payment")', { dwell: 80, after: 0 })
  d.mark('checkoutLoading')
  await d.stepUntil('#checkout-holder-name', 10)
  d.mark('summaryReady')
  // Bring the whole checkout panel (summary + card form) into view.
  const panelTop = await page.locator('text=Pay with Wompi').first().boundingBox()
  await d.scrollTo((await page.evaluate(() => window.scrollY)) + panelTop.y - 90, 450)
  await d.wait(500) // let the summary read

  // ── 5. Card details (sped up) ─────────────────────────────────────────
  d.mark('cardStart')
  await d.click('#checkout-holder-name')
  await d.type(CARD.holder)
  await d.click('#checkout-card-number')
  await d.type(CARD.number)
  await d.click('#checkout-expiry')
  await d.type(CARD.expiry)
  await d.click('#checkout-cvc')
  await d.type(CARD.cvc)
  const pay = 'form button[type="submit"]:has-text("Pay")'
  await d.ensureVisible(pay, { margin: 90 })
  await d.moveTo(pay)
  d.mark('cardEnd')

  // ── 6. Pay → confirmation with the locker ─────────────────────────────
  await d.click(null, { dwell: 80, after: 0 })
  d.mark('paying')
  await d.stepUntil('text=You\'re booked.', 20)
  d.mark('booked')
  await d.wait(800) // the shutter rolls up
  const locker = page.locator('p.locker-code').last().locator('xpath=../..')
  await d.ensureVisible('p.locker-code >> nth=-1', { margin: 220, ms: 400 })
  d.mark('zoomStart')
  await d.page.mouse.move(0, 0)
  await page.evaluate(() => window.__demo.hide())
  // Locker box a little below centre, so "You're booked." above it stays
  // clear of the sticky header.
  await d.zoomTo(await boxCenter(locker), 1.6, { to: { x: 720, y: 560 } })
  await d.wait(LOCKER_HOLD_SECONDS * 1000)
  d.mark('end')

  const lockerText = (await locker.innerText()).replace(/\s+/g, ' ')
  console.log('  locker on screen:', lockerText)

  const timeline = await d.stopRecording()
  if (d.blocked.length) throw new Error(`the page tried to write: ${d.blocked.join(', ')}`)

  const segments = [
    { from: 'open', to: 'typeStart' },
    { from: 'typeStart', to: 'typeEnd', speed: 2 },
    { from: 'typeEnd', to: 'itemLoading' },
    { from: 'itemLoading', to: 'itemReady', max: 0.1 },
    { from: 'itemReady', to: 'datesPicked' },
    { from: 'datesPicked', to: 'breakdownReady', max: 0.3 },
    { from: 'breakdownReady', to: 'checkoutLoading' },
    { from: 'checkoutLoading', to: 'summaryReady', max: 0.3 },
    { from: 'summaryReady', to: 'cardStart' },
    { from: 'cardStart', to: 'cardEnd', fit: 0.9 },
    { from: 'cardEnd', to: 'paying' },
    { from: 'paying', to: 'booked', max: 0.4 },
    { from: 'booked', to: 'end' },
  ]
  console.log(`  ${timeline.frames} frames filmed`)
  const out = join(OUT, 'video2_buscar_alquilar_pagar.mp4')
  const { planned, probe } = encode({ timeline, segments, out })
  console.log(`  ✓ ${out}\n    ${probe.seconds?.toFixed(2)} s (planned ${planned.toFixed(2)} s) · ${probe.stream}`)
  contactSheet(out, join(OUT, 'review', 'v2_sheet.png'))
} finally {
  await d.close()
}

async function boxCenter(locator) {
  const box = await locator.first().boundingBox()
  if (!box) throw new Error('element has no box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}
