// VIDEO 3 · Publish an item with an AI price (~8 s)
//
//   node video3-publish.mjs           # the video (really publishes)
//   node video3-publish.mjs --still   # 2x PNG of the form with the AI price; publishes nothing
//   node video3-publish.mjs --encode-only   # re-cut the last take from its saved frames
//
// Needs `npm run build && npm run preview` at the repo root and the
// disposable account in .env.demo, which must be a verified host.
//
// The video writes for real: the listing row, its three photos in the
// item-photos bucket and their item_photos rows, plus the AI helpers' cache
// upserts. cleanup.mjs and the SQL in README.md remove all of it. The still
// only lets the AI helpers through.

import { join } from 'node:path'
import { mkdirSync, readFileSync } from 'node:fs'
import { Director, HERE, readDemoEnv } from './lib/director.mjs'
import { encode, contactSheet } from './lib/encode.mjs'

const STILL = process.argv.includes('--still')
const ENCODE_ONLY = process.argv.includes('--encode-only')
const env = readDemoEnv()
const OUT = join(HERE, 'out')
mkdirSync(join(OUT, 'review'), { recursive: true })

const TITLE = 'Camping tent · 4 people'
const DESCRIPTION = 'Dome tent for four with rainfly, stakes and carry bag. Sets up in 10 minutes.'
const PHOTOS = [1, 2, 3].map((n) => join(HERE, 'assets', `tent-${n}.jpg`))
const PRICE_HOLD_SECONDS = 1.5

const AI_FUNCTIONS = ['/functions/v1/estimate-item-size', '/functions/v1/suggest-price']
const PUBLISH_WRITES = ['/rest/v1/items', '/rest/v1/item_photos', /^\/storage\/v1\/object\/item-photos\//]

const SEGMENTS = [
  { from: 'open', to: 'photosPicked' },
  { from: 'photosPicked', to: 'photosShown', max: 0.3 },
  { from: 'photosShown', to: 'detailsStart' },
  { from: 'detailsStart', to: 'detailsEnd', fit: 1.3 },
  { from: 'detailsEnd', to: 'sizeReady', max: 0.2 },
  { from: 'sizeReady', to: 'thinking' },
  { from: 'thinking', to: 'suggested', max: 0.5 },
  { from: 'suggested', to: 'holdEnd' },
  { from: 'holdEnd', to: 'cityStart' },
  { from: 'cityStart', to: 'cityEnd', fit: 0.5 },
  { from: 'cityEnd', to: 'publishing' },
  { from: 'publishing', to: 'live', max: 0.4 },
  { from: 'live', to: 'end' },
]

function cut(timeline) {
  const out = join(OUT, 'video3_publicar_precio_ia.mp4')
  const { planned, probe } = encode({ timeline, segments: SEGMENTS, out })
  console.log(`  ✓ ${out}\n    ${probe.seconds?.toFixed(2)} s (planned ${planned.toFixed(2)} s) · ${probe.stream}`)
  contactSheet(out, join(OUT, 'review', 'v3_sheet.png'))
}

// Re-cut the last take from its saved frames, without filming (or
// publishing) again.
if (ENCODE_ONLY) {
  cut(JSON.parse(readFileSync(join(HERE, '.frames', 'video3', 'timeline.json'), 'utf8')))
  process.exit(0)
}

const d = await Director.launch({
  name: STILL ? 'still3' : 'video3',
  deviceScaleFactor: STILL ? 2 : 1,
  allowWrites: STILL ? AI_FUNCTIONS : [...AI_FUNCTIONS, ...PUBLISH_WRITES],
})
const { page } = d
const suggestion = 'div:has(> div > p:has-text("Suggestion:"))'

try {
  await d.signIn(env.DEMO_EMAIL, env.DEMO_PASSWORD)
  await d.goto('/publish', { ready: '#title', settleMs: 800 })
  await page.locator('[aria-label="Category"] button').first().waitFor()

  if (!STILL) {
    await d.startRecording()
    await d.showCursor()
  }
  d.mark('open')
  await d.wait(250)

  // ── 1. Three photos ───────────────────────────────────────────────────
  // The "Add photo" tile is a label around the file input: clicking it opens
  // the file chooser, which takes the files (same as setInputFiles).
  const chooser = page.waitForEvent('filechooser')
  await d.click('label:has-text("Add photo")', { after: 0 })
  await (await chooser).setFiles(PHOTOS)
  d.mark('photosPicked')
  await d.stepUntil('img[alt="Item photo 3"]')
  await page.waitForFunction(() => [...document.images].every((i) => i.complete))
  d.mark('photosShown')
  await d.wait(450)

  // ── 2. What it is (sped up) ───────────────────────────────────────────
  d.mark('detailsStart')
  await d.click('[aria-label="Category"] button:has-text("Camping Equipment")')
  await d.click('#title')
  await d.type(TITLE)
  await d.click('#description')
  await d.type(DESCRIPTION)
  d.mark('detailsEnd')
  // The size step estimates in the background (estimate-item-size, 800 ms
  // after the last edit). Wait until it has settled: a re-estimate swaps the
  // result for a shorter skeleton and moves the price button mid-click.
  await settleSize()
  d.mark('sizeReady')

  // ── 3. AI price ───────────────────────────────────────────────────────
  const stepTop = await page.locator('#step-price').boundingBox()
  await d.scrollTo((await page.evaluate(() => window.scrollY)) + stepTop.y - 230, 550)
  await d.click('button:has-text("Suggest a price")', { after: 0 })
  d.mark('thinking')
  await d.stepUntil(suggestion, 40)
  d.mark('suggested')
  const box = await page.locator(suggestion).first().boundingBox()
  const range = (await page.locator(`${suggestion} .num`).first().innerText()).trim()
  console.log('  AI suggestion:', range)

  if (STILL) {
    // Type the midpoint into the field so the live preview shows a price
    // too, while the suggestion stays on screen.
    const [min, max] = range.replace(/\$/g, '').split(/[–-]/).map(Number)
    await page.fill('#pricePerDay', String(Math.round(((min + max) / 2) * 100) / 100))
    await page.evaluate(() => window.__demo.hide())
    await page.mouse.move(0, 0)
    await d.wait(400)
    const png = join(OUT, 'publicar_precio_ia_2x.png')
    await page.screenshot({ path: png })
    console.log(`  ✓ ${png}`)
  } else {
    await d.wait(150)
    await d.zoomTo({ x: box.x + box.width / 2, y: box.y + box.height / 2 }, 1.8)
    await d.wait(PRICE_HOLD_SECONDS * 1000)
    d.mark('holdEnd')
    await d.click(`${suggestion} button:has-text("Use this price")`, { after: 200 })
    await page.evaluate(() => window.__demo.unzoom())
    await d.wait(750)

    // ── 4. Pickup city (sped up), then publish ────────────────────────
    d.mark('cityStart')
    await d.ensureVisible('#locationCity', { margin: 120, ms: 450 })
    await d.click('#locationCity', { after: 0 })
    await page.selectOption('#locationCity', 'San Salvador')
    await d.wait(150)
    d.mark('cityEnd')
    const publish = 'aside button[type="submit"]'
    await d.click(publish, { dwell: 80, after: 0 })
    d.mark('publishing')
    await d.stepUntil('text=It\'s live on Lendrop', 30)
    d.mark('live')
    await page.waitForFunction(() => [...document.images].every((i) => i.complete))
    await d.wait(800)
    d.mark('end')

    const timeline = await d.stopRecording()
    if (d.blocked.length) throw new Error(`the page tried to write: ${d.blocked.join(', ')}`)

    console.log(`  ${timeline.frames} frames filmed`)
    cut(timeline)
  }
  if (d.blocked.length) throw new Error(`the page tried to write: ${d.blocked.join(', ')}`)
} finally {
  await d.close()
}

async function settleSize() {
  const done = '#step-size button:has-text("Adjust measurements")'
  const loading = '#step-size :text("Estimating your item")'
  let steady = 0
  for (let i = 0; i < 40 * 30 && steady < 30; i++) {
    const ok = (await page.locator(done).isVisible()) && !(await page.locator(loading).isVisible())
    steady = ok ? steady + 1 : 0
    await d.wait(1000 / 30)
  }
  if (steady < 30) throw new Error('the size estimate never settled')
}
