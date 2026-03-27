'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profile)
    }
    getUser()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="32" height="32" viewBox="0 0 80 80">
            <rect x="4" y="4" width="52" height="42" rx="10" fill="#111111"/>
            <path d="M14 46 L10 62 L28 46Z" fill="#111111"/>
            <circle cx="18" cy="25" r="4" fill="#ffffff"/>
            <circle cx="30" cy="25" r="4" fill="#ffffff"/>
            <circle cx="42" cy="25" r="4" fill="#ffffff"/>
            <circle cx="58" cy="56" r="18" fill="#7C3AED"/>
            <path d="M52 47 L52 65 L70 56Z" fill="#ffffff"/>
          </svg>
          <svg width="120" height="28" viewBox="0 0 120 28">
            <text x="0" y="22" fontFamily="'DM Sans',system-ui" fontWeight="800" fontSize="24" fill="#7C3AED" letterSpacing="-0.5">Reel</text>
            <text x="56" y="22" fontFamily="'DM Sans',system-ui" fontWeight="400" fontSize="24" fill="#7C3AED" opacity="0.4" letterSpacing="-0.5">mates</text>
          </svg>
        </div>
        <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>
          Sign out
        </button>
      </div>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <svg width="64" height="64" viewBox="0 0 80 80" style={{ marginBottom: '20px' }}>
          <rect x="4" y="4" width="52" height="42" rx="10" fill="#111111"/>
          <path d="M14 46 L10 62 L28 46Z" fill="#111111"/>
          <circle cx="18" cy="25" r="4" fill="#ffffff"/>
          <circle cx="30" cy="25" r="4" fill="#ffffff"/>
          <circle cx="42" cy="25" r="4" fill="#ffffff"/>
          <circle cx="58" cy="56" r="18" fill="#7C3AED"/>
          <path d="M52 47 L52 65 L70 56Z" fill="#ffffff"/>
        </svg>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          You're in{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.
        </h1>
        <p style={{ fontSize: '16px', color: '#888', marginBottom: '8px' }}>
          @{profile?.username || 'loading...'}
        </p>
        <p style={{ fontSize: '14px', color: '#aaa' }}>
          Auth is working. The feed is next.
        </p>
      </div>
    </div>
  )
}