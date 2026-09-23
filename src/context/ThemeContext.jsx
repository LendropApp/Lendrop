import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Theme state: 'light' | 'dark' | 'system'.
 *
 * `theme` is what the user picked. `resolvedTheme` is what is actually on
 * screen — the two differ only while `theme` is 'system', where the OS decides
 * and can change under us at any moment (macOS/Windows auto night mode), so
 * the media query stays subscribed for as long as 'system' is selected.
 *
 * The DOM side of this (the `dark` class and the meta tag) is also done by an
 * inline script in index.html before React mounts. Both must agree, so the
 * storage key and the colour values live in constants shared by name with that
 * script — if you change one, change the other.
 */

export const THEME_STORAGE_KEY = 'lendrop_theme'
export const THEMES = ['light', 'dark', 'system']

// Must match --bg in src/index.css for each theme: this paints the browser
// chrome on mobile, and a mismatch shows as a seam above the page.
const META_THEME_COLOR = {
  light: '#fafafa',
  dark: '#0d0d0d',
}

const ThemeContext = createContext(null)

/** Storage can throw outright in private mode or with site data blocked. */
function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return THEMES.includes(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Preference just won't survive a reload. Not worth surfacing.
  }
}

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function applyTheme(resolved) {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved

  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = META_THEME_COLOR[resolved]
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  // Only subscribed while 'system' is selected — an explicit choice should not
  // be second-guessed when the OS flips at sunset.
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return

    const onChange = (event) => setSystemDark(event.matches)
    setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = useCallback((next) => {
    if (!THEMES.includes(next)) return
    setThemeState(next)
    storeTheme(next)
    // TODO: once profiles has a `theme` column, mirror the choice there so it
    // follows the user across devices. Needs its own migration, and an RLS
    // policy allowing only the owner to update their own row. Keep localStorage
    // as the fast path so the first paint never waits on the network.
  }, [])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, themes: THEMES }),
    [theme, resolvedTheme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider')
  return context
}
