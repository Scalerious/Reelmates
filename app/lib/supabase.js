import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // Redirect to login when session token is invalid/expired
  client.auth.onAuthStateChange((event) => {
    if (event === 'TOKEN_REFRESHED') return
    if (event === 'SIGNED_OUT') {
      window.location.href = '/login'
    }
  })

  return client
}