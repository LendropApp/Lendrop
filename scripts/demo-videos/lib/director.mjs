// Drives the real Lendrop UI and films it, frame by frame.
//
// Real-time capture doesn't hold up on this machine: the CDP screencast
// managed ~19 fps and delivered frames seconds late, stamped with the time
// they were sent rather than painted, so they couldn't be lined up with what
// the script did. Instead, time is frozen while filming. Each frame advances
// the page's clock (timers, rAF, Date) and every CSS transition/animation by
// exactly 1/30 s, then takes a quality-100 screenshot. The cursor glides,
// click rings and zooms are still plain CSS transitions; they just play on
// this stepped timeline, so the clip is a true 30 fps with no dropped frames.

import { chromium } from 'playwright'
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { installOverlay } from './overlay.js'

export const HERE = join(dirname(fileURLToPath(import.meta.url)), '..')
export const REPO = join(HERE, '..', '..')
// The production build (npm run build && npm run preview). The dev server
// runs React in StrictMode, which mounts the checkout panel twice and fires
// create_checkout twice in a race; the loser shows "dates unavailable".
export const BASE_URL = process.env.LENDROP_URL ?? 'http://localhost:4173'

export const VIEWPORT = { width: 1440, height: 900 }
export const RING_COLOR = '#A58CF4'
export const MOVE_MS = 450
export const FPS = 30
const FRAME_MS = 1000 / FPS

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rand = (a, b) => a + Math.random() * (b - a)

export function readDemoEnv() {
  const file = join(HERE, '.env.demo')
  if (!existsSync(file)) throw new Error('scripts/demo-videos/.env.demo not found')
  return Object.fromEntries(
    readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  )
}

// RPCs the filmed screens call that only read. All are declared STABLE, and
// Postgres refuses INSERT/UPDATE/DELETE inside a STABLE function.
const READ_ONLY_RPCS = new Set([
  'get_currently_rented_item_ids',
  'get_item_booked_ranges',
  'calculate_pricing_breakdown',
  'has_locker_capacity_for_item',
])

function supabaseOrigin() {
  const env = readFileSync(join(REPO, '.env'), 'utf8')
  const url = env.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim()
  if (!url) throw new Error('VITE_SUPABASE_URL missing from .env')
  return new URL(url).origin
}

export class Director {
  static async launch({ name, colorScheme = 'light', allowWrites = [], mocks = [], deviceScaleFactor = 1 } = {}) {
    // --lang pins the native date input to dd/mm/yyyy (as written in El
    // Salvador) instead of following the capture machine's Windows locale.
    const browser = await chromium.launch({ args: ['--lang=en-GB'] })
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor,
      colorScheme,
      locale: 'en-US',
      timezoneId: 'America/El_Salvador',
      reducedMotion: 'no-preference',
    })
    await context.addInitScript(installOverlay, {
      ringColor: RING_COLOR,
      moveMs: MOVE_MS,
      startX: VIEWPORT.width * 0.62,
      startY: VIEWPORT.height * 0.72,
    })
    // The app picks its theme from localStorage before React mounts.
    await context.addInitScript((theme) => {
      try { localStorage.setItem('lendrop_theme', theme) } catch {}
    }, colorScheme)

    const d = new Director(browser, context, name)
    await d.#guard(allowWrites, mocks)
    d.page = await context.newPage()
    await d.page.clock.install()
    return d
  }

  constructor(browser, context, name) {
    this.browser = browser
    this.context = context
    this.name = name
    this.frameDir = join(HERE, '.frames', name)
    this.frames = 0
    this.writes = []
    this.marks = {}
    this.frozen = false
    this.animations = new Map() // CDP animation id → virtual start (ms)
    this.vt = 0
    this.blocked = []
  }

  // Every Supabase request that could write is aborted unless the script
  // allowed it, or answered from a mock. Reads and password sign-in pass.
  async #guard(allowWrites, mocks) {
    const origin = supabaseOrigin()
    await this.context.route((url) => url.origin === origin, async (route) => {
      const req = route.request()
      const { pathname, searchParams } = new URL(req.url())
      const mock = mocks.find((m) => m.method === req.method() && m.path === pathname)
      if (mock) {
        if (mock.delayMs) await sleep(mock.delayMs)
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.body(req)) })
      }
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return route.continue()
      if (pathname === '/auth/v1/token' && ['password', 'refresh_token'].includes(searchParams.get('grant_type'))) {
        return route.continue()
      }
      const rpc = pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1]
      if (rpc && READ_ONLY_RPCS.has(rpc)) return route.continue()
      if (allowWrites.some((p) => (typeof p === 'string' ? pathname === p : p.test(pathname)))) return route.continue()
      this.blocked.push(`${req.method()} ${pathname}`)
      console.warn(`  ⛔ blocked write: ${req.method()} ${pathname}`)
      return route.abort('blockedbyclient')
    })
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  // Loads at normal speed (time flows); startRecording() freezes it again.
  async goto(path, { ready, settleMs = 600 } = {}) {
    await this.#thaw()
    await this.page.goto(BASE_URL + path, { waitUntil: 'load' })
    if (ready) await this.page.locator(ready).first().waitFor({ timeout: 30000 })
    await this.waitForImages()
    await sleep(settleMs)
  }

  // Off camera: signs in through the real login form.
  async signIn(email, password) {
    await this.goto('/login', { ready: '#email', settleMs: 200 })
    await this.page.fill('#email', email)
    await this.page.fill('#password', password)
    await this.page.click('button[type="submit"]')
    await this.page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 })
  }

  async waitForImages(timeout = 15000) {
    await this.page
      .waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout })
      .catch(() => console.warn('  ! some images never finished loading'))
  }

  // ── Recording ──────────────────────────────────────────────────────────

  // Freezes time and starts filming. Can be called again after an off-camera
  // stretch (goto() thaws): frame numbers carry on, so whatever happened in
  // between simply isn't in the footage.
  async startRecording() {
    if (this.frames === 0) {
      rmSync(this.frameDir, { recursive: true, force: true })
      mkdirSync(this.frameDir, { recursive: true })
    }
    await this.#freeze()
    this.recording = true
  }

  async stopRecording() {
    this.recording = false
    await Promise.all(this.writes)
    const timeline = { fps: FPS, frames: this.frames, dir: this.frameDir, marks: this.marks }
    writeFileSync(join(this.frameDir, 'timeline.json'), JSON.stringify(timeline, null, 1))
    return timeline
  }

  async #freeze() {
    if (this.frozen) return
    const now = await this.page.evaluate(() => Date.now())
    await this.page.clock.pauseAt(now + 1000)
    this.cdp = await this.context.newCDPSession(this.page)
    this.animations.clear()
    await this.cdp.send('Animation.enable')
    await this.cdp.send('Animation.setPlaybackRate', { playbackRate: 0 })
    this.cdp.on('Animation.animationStarted', ({ animation }) => {
      this.animations.set(animation.id, this.vt)
    })
    this.frozen = true
  }

  async #thaw() {
    if (!this.frozen) return
    await this.cdp.detach().catch(() => {})
    await this.page.clock.resume()
    this.frozen = false
  }

  // Advance n frames of virtual time, filming each one.
  async step(n = 1) {
    for (let i = 0; i < n; i++) {
      await this.page.clock.runFor(FRAME_MS)
      this.vt += FRAME_MS
      await this.#seekAnimations()
      if (this.recording) await this.#snap()
    }
  }

  async #seekAnimations() {
    if (!this.animations.size) return
    const byStart = new Map()
    for (const [id, start] of this.animations) {
      const t = this.vt - start
      if (!byStart.has(t)) byStart.set(t, [])
      byStart.get(t).push(id)
    }
    for (const [t, ids] of byStart) {
      await this.cdp.send('Animation.seekAnimations', { animations: ids, currentTime: t }).catch(() => {
        for (const id of ids) this.animations.delete(id)
      })
    }
  }

  async #snap() {
    const { data } = await this.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 100 })
    const file = join(this.frameDir, `${String(this.frames).padStart(5, '0')}.jpg`)
    this.writes.push(writeFile(file, Buffer.from(data, 'base64')))
    this.frames++
  }

  // Waits on the film's clock while frozen, on the wall clock otherwise.
  async wait(ms) {
    if (this.frozen) await this.step(Math.max(1, Math.round(ms / FRAME_MS)))
    else await sleep(ms)
  }

  // Keep filming until a network-backed result shows up. A reply that takes
  // a second of real time lands a few frames in, which reads as a quick,
  // honest loading state.
  async stepUntil(selector, maxSeconds = 6) {
    const target = this.page.locator(selector).first()
    if (!this.frozen) return target.waitFor({ timeout: maxSeconds * 1000 }).then(() => true)
    for (let i = 0; i < maxSeconds * FPS; i++) {
      if (await target.isVisible().catch(() => false)) return true
      await this.step()
    }
    const shot = join(HERE, 'out', 'review', `${this.name}_stuck.png`)
    await this.page.screenshot({ path: shot }).catch(() => {})
    throw new Error(`still waiting for ${selector} after ${maxSeconds} s of footage (see ${shot})`)
  }

  // Frames take longer to shoot than they last, so the page's frozen clock
  // falls behind the server's. Before anything that compares the two (a
  // checkout countdown to a server-set expiry), jump it forward to now.
  async syncClock() {
    const behind = await this.page.evaluate(() => Date.now())
    if (Date.now() > behind) await this.page.clock.pauseAt(Date.now())
  }

  // Marks are frame numbers; encode.mjs cuts and speeds up between them.
  mark(label) {
    this.marks[label] = this.frames
  }

  // ── Cursor ─────────────────────────────────────────────────────────────

  async centerOf(target) {
    if (typeof target === 'object' && 'x' in target) return target
    const box = await this.page.locator(target).first().boundingBox()
    if (!box) throw new Error(`no box for ${target}`)
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }

  async showCursor() {
    await this.page.evaluate(() => window.__demo.show())
  }

  async moveTo(target, ms = MOVE_MS) {
    const { x, y } = await this.centerOf(target)
    await this.page.evaluate(([x, y, ms]) => window.__demo.move(x, y, ms), [x, y, ms])
    // Hover states follow the fake cursor (the real pointer is invisible).
    await this.page.mouse.move(x, y)
    await this.wait(ms + 30)
    return { x, y }
  }

  async click(target, { ms = MOVE_MS, dwell = 60, after = 120 } = {}) {
    if (target) await this.moveTo(target, ms)
    if (dwell) await this.wait(dwell)
    await this.page.evaluate(() => window.__demo.press())
    await this.page.mouse.down()
    await this.wait(120)
    await this.page.evaluate(() => window.__demo.release())
    await this.page.mouse.up()
    if (after) await this.wait(after)
  }

  // Key by key, 35–50 ms apart; encode.mjs speeds these stretches up.
  async type(text, { min = 35, max = 50 } = {}) {
    let owed = 0 // virtual ms not yet filmed, so the average stays exact
    for (const ch of text) {
      await this.page.keyboard.type(ch)
      if (!this.frozen) {
        await sleep(rand(min, max))
        continue
      }
      owed += rand(min, max)
      const n = Math.floor(owed / FRAME_MS)
      if (n) await this.step(n)
      owed -= n * FRAME_MS
    }
  }

  // ── Scrolling ──────────────────────────────────────────────────────────

  // Eased (in-out cubic) scroll to a document Y, one step per frame.
  async scrollTo(y, ms = 600) {
    const from = await this.page.evaluate(() => window.scrollY)
    const to = await this.page.evaluate((y) => Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight)), y)
    const n = Math.max(1, Math.round(ms / FRAME_MS))
    for (let i = 1; i <= n; i++) {
      const t = i / n
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
      await this.page.evaluate((y) => window.scrollTo(0, y), from + (to - from) * e)
      if (this.frozen) await this.step()
    }
  }

  // Glides the page until the element sits comfortably inside the viewport.
  async ensureVisible(selector, { margin = 110, ms = 600 } = {}) {
    const box = await this.page.locator(selector).first().boundingBox()
    if (!box) throw new Error(`no box for ${selector}`)
    const vh = VIEWPORT.height
    if (box.y >= margin && box.y + box.height <= vh - margin) return
    const y = await this.page.evaluate(() => window.scrollY)
    await this.scrollTo(y + box.y + box.height / 2 - vh / 2, ms)
  }

  // ── Zoom (CSS transform on #root, 700 ms ease-in-out) ───────────────────

  async zoomTo(target, scale = 1.8, { to, ms = 700 } = {}) {
    const c = await this.centerOf(target)
    await this.page.evaluate(([c, s, to]) => window.__demo.zoom(c, s, to), [c, scale, to])
    await this.wait(ms + 50)
  }

  async close() {
    await this.browser.close()
  }
}

export { sleep }
