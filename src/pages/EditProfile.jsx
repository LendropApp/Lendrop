import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient.js'
import LockerAvatar from '../components/LockerAvatar'

export default function EditProfile() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    bio: '',
    city: '',
    country: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    async function loadProfile() {
      if (!user) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, bio, city, country, avatar_url, verification_status, average_rating, total_reviews')
        .eq('id', user.id)
        .single()

    if (error) {
      console.error('Error loading profile:', error)
      setError(error.message)
      setLoading(false)
      return
    }

    setForm({
      full_name: data.full_name || '',
      phone: data.phone || '',
      bio: data.bio || '',
      city: data.city || '',
      country: data.country || '',
    })

    setAvatarPreview(data.avatar_url || '')

    setLoading(false)
    }

    loadProfile()
  }, [user])

  function handleChange(event) {
  const { name, value } = event.target

  setForm((current) => ({
    ...current,
    [name]: value,
  }))
}

function handleAvatarChange(event) {
  const file = event.target.files?.[0]

  if (!file) return

  if (!file.type.startsWith('image/')) {
    setError('Please select an image file.')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    setError('The image must be smaller than 5 MB.')
    return
  }

  setError(null)
  setAvatarFile(file)
  setAvatarPreview(URL.createObjectURL(file))
}

  async function handleSubmit(event) {
    event.preventDefault()

    if (!user) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    let avatarUrl = avatarPreview

if (avatarFile) {
  const fileExtension = avatarFile.name.split('.').pop()
  const filePath = `${user.id}/avatar.${fileExtension}`

  const { error: uploadError } = await supabase.storage
    .from('profile-avatars')
    .upload(filePath, avatarFile, {
      upsert: true,
      contentType: avatarFile.type,
    })

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError)
    setError(uploadError.message)
    setSaving(false)
    return
  }

  const { data: publicUrlData } = supabase.storage
    .from('profile-avatars')
    .getPublicUrl(filePath)

  avatarUrl = publicUrlData.publicUrl
}

const { error } = await supabase
  .from('profiles')
  .update({
    full_name: form.full_name.trim(),
    phone: form.phone.trim(),
    bio: form.bio.trim(),
    city: form.city.trim(),
    country: form.country.trim(),
    avatar_url: avatarUrl,
  })
  .eq('id', user.id)

    if (error) {
      console.error('Error updating profile:', error)
      setError(error.message)
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)

    setTimeout(() => {
      navigate('/profile')
    }, 700)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5ff]">
        <p className="text-sm text-jet-black/50">Loading profile...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5ff]">
        <p className="text-sm text-jet-black/50">
          Please log in to edit your profile.
        </p>
      </div>
    )
  }

  const firstName = form.full_name?.split(' ')[0] || 'User'

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f5ff]">

      {/* Lendrop background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-deep-purple/20 blur-3xl" />

        <div className="absolute -right-40 top-10 h-[560px] w-[560px] rounded-full bg-lavender/30 blur-3xl" />

        <div className="absolute bottom-[-280px] left-[20%] h-[600px] w-[600px] rounded-full bg-deep-purple/10 blur-3xl" />

        <div className="absolute left-[7%] top-[30%] h-20 w-20 rotate-12 rounded-2xl border border-deep-purple/10 bg-white/30 backdrop-blur-sm" />

        <div className="absolute right-[8%] top-[62%] h-28 w-28 -rotate-12 rounded-3xl border border-lavender/20 bg-white/30 backdrop-blur-sm" />

        <div className="absolute left-[14%] bottom-[12%] h-12 w-12 rotate-45 rounded-xl border border-deep-purple/10 bg-white/20" />
      </div>

      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(67,48,117,1) 1px, transparent 1px), linear-gradient(90deg, rgba(67,48,117,1) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      />

      <div className="relative z-10">

        {/* Header */}
        <header className="border-b border-white/60 bg-white/45 backdrop-blur-xl">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4 sm:px-10">

            <Link
              to="/profile"
              className="flex items-center gap-2 text-sm font-medium text-jet-black/60 transition hover:text-deep-purple"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Profile
            </Link>

            <img
              src="/logo-lendrop.png"
              alt="Lendrop"
              className="h-7 w-auto"
            />

            <div className="w-24" />
          </div>
        </header>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 py-10 sm:px-10">

          <section className="rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_30px_80px_-30px_rgba(67,48,117,0.45)] backdrop-blur-xl sm:p-10">

            {/* Title */}
            <div className="text-center">
              <h1 className="font-display text-3xl font-bold text-jet-black">
                Edit Profile
              </h1>

              <p className="mt-2 text-sm text-jet-black/50">
                Update your personal information
              </p>
            </div>

            <div className="mt-8 flex flex-col items-center justify-center">
  <LockerAvatar
    label={firstName}
    photoUrl={avatarPreview}
    size="lg"
  />

  <label
    htmlFor="avatar"
    className="mt-4 cursor-pointer rounded-xl border border-deep-purple/20 bg-white px-4 py-2 text-sm font-semibold text-deep-purple transition hover:bg-lavender/10"
  >
    Change Photo
  </label>

  <input
    id="avatar"
    type="file"
    accept="image/*"
    onChange={handleAvatarChange}
    className="hidden"
  />
</div>

            <form
              onSubmit={handleSubmit}
              className="mt-10 space-y-6"
            >

              {/* Full Name */}
              <div>
                <label
                  htmlFor="full_name"
                  className="mb-2 block text-sm font-semibold text-jet-black"
                >
                  Full Name
                </label>

                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={form.full_name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-jet-black/10 bg-white px-4 py-3 text-sm text-jet-black outline-none transition placeholder:text-jet-black/30 focus:border-deep-purple/40 focus:ring-4 focus:ring-lavender/10"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-jet-black"
                >
                  Phone
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-jet-black/10 bg-white px-4 py-3 text-sm text-jet-black outline-none transition placeholder:text-jet-black/30 focus:border-deep-purple/40 focus:ring-4 focus:ring-lavender/10"
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Bio */}
              <div>
                <label
                  htmlFor="bio"
                  className="mb-2 block text-sm font-semibold text-jet-black"
                >
                  Bio
                </label>

                <textarea
                  id="bio"
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-jet-black/10 bg-white px-4 py-3 text-sm text-jet-black outline-none transition placeholder:text-jet-black/30 focus:border-deep-purple/40 focus:ring-4 focus:ring-lavender/10"
                  placeholder="Tell people a little about yourself"
                />
              </div>

              {/* City */}
              <div>
                <label
                  htmlFor="city"
                  className="mb-2 block text-sm font-semibold text-jet-black"
                >
                  City
                </label>

                <input
                  id="city"
                  name="city"
                  type="text"
                  value={form.city}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-jet-black/10 bg-white px-4 py-3 text-sm text-jet-black outline-none transition placeholder:text-jet-black/30 focus:border-deep-purple/40 focus:ring-4 focus:ring-lavender/10"
                  placeholder="Enter your city"
                />
              </div>

              {/* Country */}
              <div>
                <label
                  htmlFor="country"
                  className="mb-2 block text-sm font-semibold text-jet-black"
                >
                  Country
                </label>

                <input
                  id="country"
                  name="country"
                  type="text"
                  value={form.country}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-jet-black/10 bg-white px-4 py-3 text-sm text-jet-black outline-none transition placeholder:text-jet-black/30 focus:border-deep-purple/40 focus:ring-4 focus:ring-lavender/10"
                  placeholder="Enter your country"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
                  Profile updated successfully.
                </div>
              )}

              {/* Save */}
              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-deep-purple to-lavender px-5 py-3.5 text-sm font-semibold text-soft-white shadow-sm transition hover:brightness-105 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>

            </form>
          </section>
        </main>
      </div>
    </div>
  )
}