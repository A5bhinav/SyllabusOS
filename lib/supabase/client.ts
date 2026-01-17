import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // createBrowserClient from @supabase/ssr automatically handles cookies
  // It stores PKCE code verifiers and other auth state in cookies
  // This ensures the code verifier is available when the callback route exchanges the code
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

