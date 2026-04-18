'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import MiniProfile from '../../components/MiniProfile'
import NavNotifButton from '../../components/NavNotifButton'

export default function FindPeople() {
  const [user, setUser] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const [{ data: conns }, { data: allProfiles }] = await Promise.all([
        supabase.from('connections').select('following_id').eq('follower_id', user.id),
        supabase.from('profiles').select('id, username, full_name, bio, location, avatar_url, email').neq('id', user.id).limit(50)
      ])
      setConnections(conns || [])
      setResults(allProfiles || [])
    }
    init()
  }, [])

  async function handleSearch(val) {
    setQuery(val)
    if (!val.trim()) {
      const { data } = await supabase.from('profiles').select('id, username, full_name, bio, location, avatar_url, email').neq('id', user?.id).limit(50)
      setResults(data || [])
      return
    }
    const { data } = await supabase.from('profiles')
      .select('id, username, full_name, bio, location, avatar_url, email')
      .or(`username.ilike.%${val}%,full_name.ilike.%${val}%,email.ilike.%${val}%`)
      .neq('id', user?.id).limit(20)
    setResults(data || [])
  }

  function isFollowing(id) {
    return connections.some(c => c.following_id === id)
  }

  async function handleConnect(profileId) {
    setLoading(true)
    if (isFollowing(profileId)) {
      await supabase.from('connections').delete().eq('follower_id', user.id).eq('following_id', profileId)
      setConnections(prev => prev.filter(c => c.following_id !== profileId))
    } else {
      await supabase.from('connections').insert({ follower_id: user.id, following_id: profileId })
      setConnections(prev => [...prev, { following_id: profileId }])
    }
    setLoading(false)
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      <div style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => router.push('/feed')}>
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
            <text y="22" fontFamily="'DM Sans',system-ui" fontSize="24" fill="#7C3AED" letterSpacing="-0.5"><tspan fontWeight="800">Reel</tspan><tspan fontWeight="400" opacity="0.4">mates</tspan></text>
          </svg>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => router.push('/feed?compose=true')} style={{ background: '#7C3AED', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', color: '#fff' }}>Say Something</button>
          <button onClick={() => router.push('/films')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Log a Film</button>
          <button onClick={() => router.push('/users')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Reelmates</button>
          <NavNotifButton />
          <MiniProfile />
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <button onClick={() => router.push('/users')}
            style={{ background: 'none', border: 'none', color: '#A78BFA', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            ← My Reelmates
          </button>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Find People</h1>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>Search by name or username to connect.</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or username…"
            autoFocus
            style={{ width: '100%', padding: '14px 18px', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '15px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#7C3AED'}
            onBlur={e => e.target.style.borderColor = '#e0e0e0'}
          />
        </div>

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map(profile => (
              <div key={profile.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', border: '1px solid #f0f0f0', borderRadius: '10px' }}>
                <div onClick={() => router.push(profile.username ? `/${profile.username}` : `/profile/${profile.id}`)} style={{ cursor: 'pointer', flexShrink: 0 }}>
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name || profile.username} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #DDD6FE', display: 'block' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F3EEFF', border: '2px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', color: '#7C3AED' }}>
                      {(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => router.push(profile.username ? `/${profile.username}` : `/profile/${profile.id}`)}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>
                    {profile.full_name || profile.username || profile.email}
                  </div>
                  <div style={{ fontSize: '13px', color: '#888' }}>
                    {profile.username ? `@${profile.username}` : profile.email}{profile.location ? ` · ${profile.location}` : ''}
                  </div>
                  {profile.bio && (
                    <div style={{ fontSize: '13px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                      {profile.bio}
                    </div>
                  )}
                </div>
                <button onClick={() => handleConnect(profile.id)} disabled={loading}
                  style={{ background: isFollowing(profile.id) ? '#F0FDF4' : '#7C3AED', color: isFollowing(profile.id) ? '#166534' : '#fff', border: isFollowing(profile.id) ? '1px solid #BBF7D0' : 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.15s' }}>
                  {isFollowing(profile.id) ? '✓ Connected' : '+ Connect'}
                </button>
              </div>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#ccc' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>No users found</div>
            <div style={{ fontSize: '13px' }}>Try a different name or username</div>
          </div>
        )}
      </div>
    </div>
  )
}
