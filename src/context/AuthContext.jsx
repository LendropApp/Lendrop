import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'



const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)

  const [loading, setLoading] = useState(true)

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
