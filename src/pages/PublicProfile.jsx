import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Edit3, MapPin, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient.js'
import LockerAvatar from '../components/LockerAvatar'

export default function PublicProfile() {
  const { user } = useAuth()

  const [profile, setProfile] = useState(null)
  const [itemsCount, setItemsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  useEffect(() => {
    async function loadProfile() {
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error loading profile:', error)
        setError(error.message)
      } else {
        console.log('Public profile from Supabase:', data)
        setProfile(data)
      }
      const { count, error: itemsError } = await supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)

      if (itemsError) {
        console.error('Error loading items count:', itemsError)
      } else {
        setItemsCount(count || 0)
      }
      setLoading(false)
    }

    loadProfile()
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-white">
        <p className="text-sm text-jet-black/50">Loading profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-white px-6">
        <div className="text-center">
          <h1 className="font-display text-xl font-semibold text-jet-black">
            Unable to load profile
          </h1>
          <p className="mt-2 text-sm text-jet-black/50">{error}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-white">
        <p className="text-sm text-jet-black/50">
          Please log in to view your profile.
        </p>
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'User'

  return (
   <div className="relative min-h-screen overflow-hidden bg-[#f7f5ff]">
  {/* Lendrop background */}
  <div className="pointer-events-none absolute inset-0 overflow-hidden">

    {/* Main purple glow */}
    <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-deep-purple/20 blur-3xl" />

    <div className="absolute -right-40 top-10 h-[560px] w-[560px] rounded-full bg-lavender/30 blur-3xl" />

    <div className="absolute bottom-[-280px] left-[20%] h-[600px] w-[600px] rounded-full bg-deep-purple/10 blur-3xl" />

    {/* Package shapes */}
    <div className="absolute left-[7%] top-[30%] h-20 w-20 rotate-12 rounded-2xl border border-deep-purple/10 bg-white/30 backdrop-blur-sm" />

    <div className="absolute right-[8%] top-[62%] h-28 w-28 -rotate-12 rounded-3xl border border-lavender/20 bg-white/30 backdrop-blur-sm" />

    <div className="absolute left-[14%] bottom-[12%] h-12 w-12 rotate-45 rounded-xl border border-deep-purple/10 bg-white/20" />

    {/* Small dots */}
    <div className="absolute left-[18%] top-[22%] h-3 w-3 rounded-full bg-lavender/40" />

    <div className="absolute right-[22%] top-[35%] h-2 w-2 rounded-full bg-deep-purple/30" />

    <div className="absolute right-[12%] bottom-[22%] h-3 w-3 rounded-full bg-lavender/40" />

    {/* Connection lines */}
    <div className="absolute left-[8%] top-[43%] h-px w-32 rotate-12 bg-deep-purple/10" />

    <div className="absolute right-[8%] top-[48%] h-px w-36 -rotate-12 bg-lavender/20" />
  </div>

  {/* Subtle grid */}
  <div
    className="pointer-events-none absolute inset-0 opacity-[0.035]"
    style={{
      backgroundImage:
        'linear-gradient(rgba(67,48,117,1) 1px, transparent 1px), linear-gradient(90deg, rgba(67,48,117,1) 1px, transparent 1px)',
      backgroundSize: '42px 42px',
    }}
  />

  <div className="relative z-10"></div>
  {/* Subtle grid */}
  <div
    className="pointer-events-none absolute inset-0 opacity-[0.035]"
    style={{
      backgroundImage:
        'linear-gradient(rgba(67,48,117,1) 1px, transparent 1px), linear-gradient(90deg, rgba(67,48,117,1) 1px, transparent 1px)',
      backgroundSize: '42px 42px',
    }}
  />

  <div className="relative z-10"></div>

        <div className="relative z-10"></div>

      {/* Header */}
      <header className="border-b border-white/60 bg-white/45 backdrop-blur-xl">

        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4 sm:px-10">
          <Link
            to="/explore"
            className="flex items-center gap-2 text-sm font-medium text-jet-black/60 transition hover:text-deep-purple"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>

          <img
            src="/logo-lendrop.png"
            alt="Lendrop"
            className="h-7 w-auto"
          />

          <div className="w-24" />
        </div>
      </header>

      {/* Profile */}
      <main className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
        <section className="rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_30px_80px_-30px_rgba(67,48,117,0.45)] backdrop-blur-xl sm:p-10">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
            <LockerAvatar
              label={firstName}
              photoUrl={profile?.avatar_url}
              verified={profile?.verification_status === 'verified'}
              size="lg"
            /> 
            <div className="mt-5 flex-1 sm:ml-6 sm:mt-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold text-jet-black">
                    {profile?.full_name || 'User'}
                  </h1>

                  {profile?.city && (
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-jet-black/50 sm:justify-start">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.city}</span>
                    </div>
                  )}
                </div>

                <Link
                  to="/edit-profile"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-deep-purple to-lavender px-5 py-2.5 text-sm font-semibold text-soft-white shadow-sm transition hover:shadow-md hover:brightness-105"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </Link>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 sm:justify-start">
                <Star className="h-4 w-4 fill-jet-black text-jet-black" />
                <span className="font-mono text-sm font-semibold text-jet-black">
                  {profile?.average_rating || 0}
                </span>
                <span className="text-sm text-jet-black/45">
                  ({profile?.total_reviews || 0} reviews)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-jet-black/5 pt-8">
            <h2 className="font-display text-lg font-semibold text-jet-black">
              About
            </h2>

            <p className="mt-3 text-sm leading-6 text-jet-black/60">
              {profile?.bio || 'No bio added yet.'}
            </p>
          </div>

          <div className="mt-8 grid gap-4 border-t border-jet-black/5 pt-8 sm:grid-cols-1">
          <div className="mt-8 grid gap-4 border-t border-jet-black/5 pt-8 sm:grid-cols-4"></div>
          <div className="rounded-2xl bg-jet-black/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-jet-black/40">
              Rating
            </p>

            <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-jet-black">
              <Star className="h-4 w-4 fill-current" />
              {Number(profile?.average_rating || 0).toFixed(1)}
            </p>
          </div>
          <div className="rounded-2xl bg-jet-black/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-jet-black/40">
              Items Listed
            </p>
            <p className="mt-1 text-sm font-semibold text-jet-black">
              {itemsCount}
            </p>
          </div>
            <div className="rounded-2xl bg-jet-black/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-jet-black/40">
                Location
              </p>
              <p className="mt-1 text-sm font-semibold text-jet-black">
                {profile?.city || 'Not provided'}
                {profile?.country ? `, ${profile.country}` : ''}
              </p>
            </div>

            <div className="rounded-2xl bg-jet-black/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-jet-black/40">
                Verification
              </p>
              <p className="mt-1 text-sm font-semibold text-jet-black">
                {profile?.verification_status === 'verified'
                  ? 'Verified'
                  : 'Not verified'}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
