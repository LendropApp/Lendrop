import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import LockerAvatar from '../components/LockerAvatar'
import StatusMessage from '../components/StatusMessage'
import AuroraBlobs from '../components/background/AuroraBlobs'

export default function EditProfile() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [status, setStatus] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name ?? '')
    setPhone(profile.phone ?? '')
    setBio(profile.bio ?? '')
    setCity(profile.city ?? '')
    setAvatarPreview(profile.avatar_url ?? '')
  }, [profile])

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus({ type: 'error', text: 'Please choose an image file.' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: 'error', text: 'Image must be smaller than 2 MB.' })
      return
    }
    setStatus({ type: '', text: '' })
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (fullName.trim().length < 2) {
      setStatus({ type: 'error', text: 'Enter your full name.' })
      return
    }

    setSaving(true)
    setStatus({ type: '', text: '' })

    let avatarUrl = profile?.avatar_url ?? null

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${user.id}/avatar-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(path, avatarFile, { contentType: avatarFile.type })

      if (uploadError) {
        setSaving(false)
        setStatus({ type: 'error', text: 'Could not upload your photo. Please try again.' })
        return
      }
      avatarUrl = supabase.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        city: city.trim() || 'San Salvador',
        avatar_url: avatarUrl,
      })
      .eq('id', user.id)

    setSaving(false)

    if (error) {
      setStatus({ type: 'error', text: 'Could not save your changes. Please try again.' })
      return
    }

    await refreshProfile()
    setStatus({ type: 'success', text: 'Profile updated.' })
    setTimeout(() => navigate('/profile'), 500)
  }

  return (
    <div className="min-h-screen bg-soft-white pb-16">
      <header className="sticky top-0 z-50 border-b border-jet-black/5 bg-soft-white/85 backdrop-blur-md">
        <div className="h-px bg-linear-to-r from-transparent via-lavender/50 to-transparent" />
        <div className="mx-auto flex max-w-xl items-center gap-3 px-6 py-4 sm:px-10">
          <Link
            to="/profile"
            aria-label="Back to Profile"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-lavender/15 text-jet-black/60 transition hover:border-lavender hover:text-deep-purple"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-semibold text-jet-black">Edit profile</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-lavender">
              Keep it accurate
            </p>
          </div>
        </div>
      </header>

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <form onSubmit={handleSubmit} className="relative mx-auto max-w-xl space-y-6 px-6 pt-8 sm:px-10">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <LockerAvatar label={fullName} photoUrl={avatarPreview} size="lg" />
              <label
                htmlFor="avatar"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-linear-to-r from-deep-purple to-lavender text-soft-white shadow-[0_4px_12px_-2px_rgba(165,140,244,0.7)]"
              >
                <Camera className="h-3.5 w-3.5" />
              </label>
              <input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-jet-black/40">Tap the camera to change your photo</p>
          </div>

          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-jet-black">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-lavender/15 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-jet-black">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+503 7000 0000"
              className="w-full rounded-xl border border-lavender/15 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
            />
          </div>

          <div>
            <label htmlFor="city" className="mb-1 block text-sm font-medium text-jet-black">
              City
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="San Salvador"
              className="w-full rounded-xl border border-lavender/15 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="bio" className="block text-sm font-medium text-jet-black">
                Bio
              </label>
              <span className="text-xs text-jet-black/40">{bio.length}/240</span>
            </div>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 240))}
              placeholder="Tell renters a little about yourself…"
              rows={4}
              className="w-full resize-none rounded-xl border border-lavender/15 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
            />
          </div>

          <StatusMessage type={status.type} text={status.text} />

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-linear-to-r from-deep-purple to-lavender py-3 text-sm font-semibold text-soft-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:shadow-[0_4px_28px_-4px_rgba(165,140,244,0.75)] hover:brightness-105 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
