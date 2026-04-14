'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function MiniProfile() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ logs: 0, watchlist: 0, connections: 0 })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [
        { data: profile },
        { count: logs },
        { count: watchlist },
        { count: connections }
      ] = await Promise.all([
        supabase.from('profiles').select('avatar_url, full_name, username').eq('id', user.id).single(),
        supabase.from('film_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('connections').select('*', { count: 'exact', head: true }).eq('follower_id', user.id)
      ])

      setProfile(profile)
      setStats({ logs: logs || 0, watchlist: watchlist || 0, connections: connections || 0 })
    }
    load()
  }, [])

  if (!profile) return null

  const initials = (profile.full_name || profile.username || '?').charAt(0).toUpperCase()

  const statStyle = {
    textAlign: 'center', lineHeight: 1, cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', transition: 'background 0.12s'
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: '#F3EEFF',
        border: '1px solid #DDD6FE',
        borderRadius: '999px',
        padding: '5px 14px 5px 5px',
      }}
    >
      {/* Avatar → Profile page */}
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="profile"
          onClick={() => router.push('/profile')}
          style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0, cursor: 'pointer' }} />
      ) : (
        <div onClick={() => router.push('/profile')}
          style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', color: '#fff', flexShrink: 0, cursor: 'pointer' }}>
          {initials}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={statStyle}
          onClick={() => router.push('/logs')}
          onMouseEnter={e => e.currentTarget.style.background = '#EDE9FE'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#7C3AED' }}>{stats.logs}</div>
          <div style={{ fontSize: '9px', color: '#A78BFA', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '1px' }}>Films</div>
        </div>
        <div style={{ width: '1px', height: '22px', background: '#DDD6FE' }} />
        <div style={statStyle}
          onClick={() => router.push('/users')}
          onMouseEnter={e => e.currentTarget.style.background = '#EDE9FE'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#7C3AED' }}>{stats.connections}</div>
          <div style={{ fontSize: '9px', color: '#A78BFA', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '1px' }}>Mates</div>
        </div>
        <div style={{ width: '1px', height: '22px', background: '#DDD6FE' }} />
        <div style={statStyle}
          onClick={() => router.push('/watchlist')}
          onMouseEnter={e => e.currentTarget.style.background = '#EDE9FE'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#7C3AED' }}>{stats.watchlist}</div>
          <div style={{ fontSize: '9px', color: '#A78BFA', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '1px' }}>Watchlist</div>
        </div>
      </div>
    </div>
  )
}
