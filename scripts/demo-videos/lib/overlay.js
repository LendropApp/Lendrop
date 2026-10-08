// Runs in the page before any app code (page.addInitScript), on every
// document the context opens. Draws the fake cursor and click rings, hides
// the scrollbars, and exposes window.__demo for the director to drive.
//
// The overlay lives directly under <html>, outside #root, so React never
// touches it and the zoom transform on #root doesn't scale it.

export function installOverlay({ ringColor, moveMs, startX, startY }) {
  const KEY = '__demo_cursor'

  // A full navigation starts a fresh document: pick up where the cursor was.
  let pos = { x: startX, y: startY, visible: false }
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY))
    if (saved) pos = saved
  } catch {}

  const css = `
    html { scrollbar-width: none !important; }
    ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
    #__demo-cursor {
      position: fixed; left: 0; top: 0; width: 32px; height: 32px;
      z-index: 2147483647; pointer-events: none;
      transition: transform ${moveMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease-out;
      will-change: transform;
    }
    #__demo-cursor svg {
      display: block; width: 32px; height: 32px; transform-origin: 3px 2px;
      transition: transform 120ms ease-out;
      filter: drop-shadow(0 2px 3px rgba(13, 13, 13, 0.35));
    }
    #__demo-cursor.is-down svg { transform: scale(0.85); }
    .__demo-ring {
      position: fixed; width: 60px; height: 60px; margin: -30px 0 0 -30px;
      border-radius: 50%; border: 3px solid ${ringColor};
      background: ${ringColor}33;
      z-index: 2147483646; pointer-events: none;
      animation: __demo-ring 450ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    @keyframes __demo-ring {
      from { transform: scale(0); opacity: 1; }
      to   { transform: scale(1); opacity: 0; }
    }
    #root.__demo-zoomable {
      transition: transform 700ms cubic-bezier(0.65, 0, 0.35, 1);
      will-change: transform;
    }
  `

  // White arrow, dark outline; the tip sits at (3, 2) in the 32 px box.
  const arrow = `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 2 L3 26 L9.2 20.4 L13.4 29.6 L17.6 27.8 L13.5 18.8 L22 18.8 Z"
            fill="#ffffff" stroke="#0d0d0d" stroke-width="2" stroke-linejoin="round"/>
    </svg>`

  function mount() {
    if (document.getElementById('__demo-cursor')) return
    const style = document.createElement('style')
    style.textContent = css
    document.documentElement.appendChild(style)
    const el = document.createElement('div')
    el.id = '__demo-cursor'
    el.innerHTML = arrow
    el.style.opacity = pos.visible ? '1' : '0'
    // No transition for the restore, or the cursor would slide in from 0,0.
    el.style.transition = 'none'
    el.style.transform = `translate(${pos.x - 3}px, ${pos.y - 2}px)`
    document.documentElement.appendChild(el)
    void el.offsetWidth
    el.style.transition = ''
  }

  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(pos)) } catch {}
  }

  if (document.documentElement) mount()
  else document.addEventListener('readystatechange', mount, { once: true })

  window.__demo = {
    pos: () => ({ ...pos }),
    show() {
      mount()
      pos.visible = true
      document.getElementById('__demo-cursor').style.opacity = '1'
      save()
    },
    hide() {
      pos.visible = false
      const el = document.getElementById('__demo-cursor')
      if (el) el.style.opacity = '0'
      save()
    },
    // Straight-line glide to (x, y); the CSS transition does the easing.
    move(x, y, ms = moveMs) {
      mount()
      const el = document.getElementById('__demo-cursor')
      el.style.transitionDuration = `${ms}ms, 200ms`
      el.style.transform = `translate(${x - 3}px, ${y - 2}px)`
      pos.x = x
      pos.y = y
      save()
    },
    press() {
      document.getElementById('__demo-cursor')?.classList.add('is-down')
      const ring = document.createElement('div')
      ring.className = '__demo-ring'
      ring.style.left = `${pos.x}px`
      ring.style.top = `${pos.y}px`
      document.documentElement.appendChild(ring)
      setTimeout(() => ring.remove(), 600)
    },
    release() {
      document.getElementById('__demo-cursor')?.classList.remove('is-down')
    },
    // Scale #root about the point that keeps `target` (viewport coords) under
    // the viewport point `to`. The origin is clamped to the viewport so the
    // zoomed page always covers the frame.
    zoom(target, scale, to) {
      const root = document.getElementById('root')
      root.classList.add('__demo-zoomable')
      const vw = innerWidth
      const vh = innerHeight
      const dest = to ?? { x: vw / 2, y: vh / 2 }
      let ox = (scale * target.x - dest.x) / (scale - 1)
      let oy = (scale * target.y - dest.y) / (scale - 1)
      ox = Math.min(vw, Math.max(0, ox))
      oy = Math.min(vh, Math.max(0, oy))
      const r = root.getBoundingClientRect()
      root.style.transformOrigin = `${ox - r.left}px ${oy - r.top}px`
      root.style.transform = `scale(${scale})`
    },
    unzoom() {
      const root = document.getElementById('root')
      root.style.transform = ''
    },
  }
}
