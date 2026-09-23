import { useEffect, useState } from 'react'
import { Bell, Calendar, KeyRound, MapPin, MessageCircle, Monitor, Moon, Palette, Star, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import SegmentedControl from '../components/SegmentedControl'
import SettingsSection from '../components/SettingsSection'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import PasswordInput from '../components/PasswordInput'
import StatusMessage from '../components/StatusMessage'
import AuroraBlobs from '../components/background/AuroraBlobs'

const DEFAULT_PREFS = {
  notify_messages: true,
  notify_reservations: true,
  notify_reviews: true,
  default_city: null,
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

const NOTIFICATION_TOGGLES = [
  {
    key: 'notify_messages',
    icon: MessageCircle,
    label: 'Messages',
    desc: 'New messages about your rentals and lendings',
  },
  {
    key: 'notify_reservations',
    icon: Calendar,
    label: 'Reservations & payments',
    desc: 'Booking confirmations, pickups, and payment updates',
  },
  {
    key: 'notify_reviews',
    icon: Star,
    label: 'Reviews',
    desc: 'When someone leaves a review on you or your item',
  },
]

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? 'bg-primary' : 'bg-jet-black/15'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition ${
          checked ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const { theme, resolvedTheme, setTheme } = useTheme()

  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefsStatus, setPrefsStatus] = useState({ type: '', text: '' })

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState({ type: '', text: '' })

  useEffect(() => {
    if (!user) return
    let cancelled = false

    Promise.all([
      supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('items').select('location_city'),
    ]).then(([prefsRes, citiesRes]) => {
      if (cancelled) return
      if (prefsRes.data) {
        setPrefs({
          notify_messages: prefsRes.data.notify_messages,
          notify_reservations: prefsRes.data.notify_reservations,
          notify_reviews: prefsRes.data.notify_reviews,
          default_city: prefsRes.data.default_city,
        })
      }
      setCities([...new Set((citiesRes.data ?? []).map((r) => r.location_city))].sort())
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user])

  function updatePref(key, value) {
    setPrefs((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSavePrefs() {
    setSaving(true)
    setPrefsStatus({ type: '', text: '' })

    const { error } = await supabase.from('user_preferences').upsert(
      { user_id: user.id, ...prefs },
      { onConflict: 'user_id' }
    )

    setSaving(false)
    setPrefsStatus(
      error
        ? { type: 'error', text: 'Could not save your preferences. Please try again.' }
        : { type: 'success', text: 'Preferences saved.' }
    )
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordStatus({ type: '', text: '' })

    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'Passwords don’t match.' })
      return
    }

    setPasswordSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSubmitting(false)

    if (error) {
      setPasswordStatus({ type: 'error', text: 'Could not update your password. Please try again.' })
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setPasswordStatus({ type: 'success', text: 'Password updated.' })
  }

  return (
    <div className="min-h-screen bg-bg pb-16">
      <PageHeader backTo="/profile" backLabel="Back to Profile" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-3xl space-y-6 px-6 py-8 sm:px-10">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">Settings</h1>
            <p className="mt-1 text-sm text-text-muted">Manage how Lendrop notifies you and browses for you.</p>
          </div>

          {/* Outside the `loading` branch on purpose: the theme comes from
              localStorage and is already known, so it should not sit behind a
              spinner waiting on user_preferences. */}
          <SettingsSection
            title="Appearance"
            description="Applies immediately. There is nothing to save."
            icon={Palette}
          >
            <SegmentedControl
              label="Theme"
              value={theme}
              onChange={setTheme}
              options={THEME_OPTIONS}
            />
            <p className="mt-3 text-xs text-text-muted" aria-live="polite">
              {theme === 'system'
                ? `Following your device, which is currently ${resolvedTheme}.`
                : `Always ${theme}.`}
            </p>
          </SettingsSection>

          {loading ? (
            <p className="py-8 text-center text-sm text-text-muted">Loading your preferences…</p>
          ) : (
            <>
              {/* ================= NOTIFICATIONS ================= */}
              <section className="rounded-2xl border border-border bg-surface p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-lg font-semibold text-text">Notifications</h2>
                </div>
                <div className="divide-y divide-border">
                  {NOTIFICATION_TOGGLES.map(({ key, icon: Icon, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised">
                          <Icon className="h-4 w-4 text-primary" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-text">{label}</p>
                          <p className="text-xs text-text-muted">{desc}</p>
                        </div>
                      </div>
                      <Toggle
                        checked={prefs[key]}
                        onChange={(v) => updatePref(key, v)}
                        label={`Toggle ${label} notifications`}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-4 border-t border-border pt-3 text-xs text-text-muted">
                  Safety notifications (disputes, account alerts) can't be muted.
                </p>
              </section>

              {/* ================= BROWSING DEFAULTS ================= */}
              <section className="rounded-2xl border border-border bg-surface p-6">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-lg font-semibold text-text">Browsing</h2>
                </div>
                <label className="mb-1 block text-sm font-medium text-text">Default city on Explore</label>
                <p className="mb-3 text-xs text-text-muted">
                  Explore will pre-filter listings to this city when you open it.
                </p>
                <select
                  value={prefs.default_city ?? ''}
                  onChange={(e) => updatePref('default_city', e.target.value || null)}
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-lavender/30"
                >
                  <option value="">All cities</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </section>

              <div className="flex items-center justify-end gap-3">
                <StatusMessage type={prefsStatus.type} text={prefsStatus.text} />
                <button
                  type="button"
                  onClick={handleSavePrefs}
                  disabled={saving}
                  className="shrink-0 rounded-full cta-brand px-5 py-2.5 text-sm font-semibold text-soft-white glow-sm transition hover:brightness-105 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save preferences'}
                </button>
              </div>

              {/* ================= ACCOUNT SECURITY ================= */}
              <section className="rounded-2xl border border-border bg-surface p-6">
                <div className="mb-4 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-lg font-semibold text-text">Password</h2>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-text">
                      New password
                    </label>
                    <PasswordInput
                      id="new-password"
                      name="newPassword"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-text">
                      Confirm new password
                    </label>
                    <PasswordInput
                      id="confirm-password"
                      name="confirmPassword"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-1">
                    <StatusMessage type={passwordStatus.type} text={passwordStatus.text} />
                    <button
                      type="submit"
                      disabled={passwordSubmitting}
                      className="shrink-0 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-text transition hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      {passwordSubmitting ? 'Updating…' : 'Update password'}
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
