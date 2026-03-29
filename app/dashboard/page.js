'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ logs: 0, watchlist: 0, connections: 0 })
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

      const { count: logCount } = await supabase
        .from('film_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { count: wlCount } = await supabase
        .from('watchlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { count: connCount } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id)

      setStats({ logs: logCount || 0, watchlist: wlCount || 0, connections: connCount || 0 })
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => router.push('/films')} style={{ background: '#7C3AED', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#fff', fontWeight: '600' }}>
            Log a Film
          </button>
          <button onClick={() => router.push('/users')} style={{ background: 'none', border: '1px solid #7C3AED', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#7C3AED', fontWeight: '600' }}>
            Find Reelmates
          </button>
          <button onClick={() => router.push('/profile')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>
            Edit Profile
          </button>
          <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '60px 24px' }}>

        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#111', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Hey{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p style={{ fontSize: '15px', color: '#888', margin: 0 }}>
            @{profile?.username || user.email}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '48px' }}>
          <div style={{ background: '#F3EEFF', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#7C3AED', marginBottom: '4px' }}>{stats.logs}</div>
            <div style={{ fontSize: '13px', color: '#6D28D9', fontWeight: '600' }}>Films logged</div>
          </div>
          <div style={{ background: '#F3EEFF', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#7C3AED', marginBottom: '4px' }}>{stats.watchlist}</div>
            <div style={{ fontSize: '13px', color: '#6D28D9', fontWeight: '600' }}>On watchlist</div>
          </div>
          <div style={{ background: '#F3EEFF', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#7C3AED', marginBottom: '4px' }}>{stats.connections}</div>
            <div style={{ fontSize: '13px', color: '#6D28D9', fontWeight: '600' }}>Reelmates</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div
            onClick={() => router.push('/films')}
            style={{ background: '#7C3AED', borderRadius: '12px', padding: '28px 24px', cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🎬</div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>Log a film</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Search and rate anything you've watched</div>
          </div>
          <div
            onClick={() => router.push('/users')}
            style={{ background: '#F3EEFF', border: '1px solid #DDD6FE', borderRadius: '12px', padding: '28px 24px', cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#7C3AED', marginBottom: '4px' }}>Find Reelmates</div>
            <div style={{ fontSize: '13px', color: '#6D28D9' }}>Connect with people who share your taste</div>
          </div>
          <div
            onClick={() => router.push('/feed')}
            style={{ background: '#FFF4ED', border: '1px solid #FED7AA', borderRadius: '12px', padding: '28px 24px', cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>📽️</div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#C2410C', marginBottom: '4px' }}>My Feed</div>
            <div style={{ fontSize: '13px', color: '#EA580C' }}>See what your Reelmates are watching</div>
          </div>
          <div
            onClick={() => router.push('/profile')}
            style={{ background: '#F5F5F5', borderRadius: '12px', padding: '28px 24px', cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>👤</div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#111', marginBottom: '4px' }}>My Profile</div>
            <div style={{ fontSize: '13px', color: '#888' }}>Edit your bio, username and location</div>
          </div>
          <div
  onClick={() => router.push('/watchlist')}
  style={{ background: '#F3EEFF', border: '1px solid #DDD6FE', borderRadius: '12px', padding: '28px 24px', cursor: 'pointer', transition: 'opacity 0.15s' }}
  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
>
  <div style={{ fontSize: '28px', marginBottom: '12px' }}>🎞️</div>
  <div style={{ fontSize: '17px', fontWeight: '800', color: '#7C3AED', marginBottom: '4px' }}>My Watchlist</div>
  <div style={{ fontSize: '13px', color: '#6D28D9' }}>Films you want to watch</div>
</div>
        </div>

      </div>
    </div>
  )
}