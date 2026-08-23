import { createClient } from '@supabase/supabase-js'



const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Lendrop] Missing Supabase environment variables. ' +
      'Copy .env.example to .env and fill in VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY with the values from Project Settings > API in Supabase.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
