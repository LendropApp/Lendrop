import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'



const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    // 1. On mount: was there already an active session?
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 2. Subscribe to future session changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Cleanup: stop listening if the component unmounts.
    return () => subscription.unsubscribe()
  }, [])

  // profiles.is_host is how the app knows someone can act as a lender
  // (see HostRoute) — kept here alongside the rest of auth state so every
  // screen reads it the same way instead of re-querying profiles itself.
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) console.error('Error loading profile:', error)
    setProfile(data ?? null)
    setProfileLoading(false)
  }, [])

  useEffect(() => {
    fetchProfile(user?.id)
  }, [user?.id, fetchProfile])

  // Call after anything that mutates profiles.is_host server-side (e.g.
  // finishing host onboarding) so context state doesn't go stale until a
  // full reload.
  const refreshProfile = useCallback(() => fetchProfile(user?.id), [fetchProfile, user?.id])


  async function signUp({ email, password, fullName, dui, dateOfBirth, agreedToTerms }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {

        data: {
          full_name: fullName,
          dui,
          date_of_birth: dateOfBirth,
          terms_accepted: agreedToTerms,
        },
      },
    })
    return { data, error }
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  }


  async function resetPasswordForEmail(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  }

  async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { data, error }
  }

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    profile,
    profileLoading,
    isHost: !!profile?.is_host,
    refreshProfile,
    signUp,
    signIn,
    signOut,
    resetPasswordForEmail,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used inside an <AuthProvider>')
  }
  return context
}
