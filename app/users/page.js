'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Users() {
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

      const { data: conns } = await supabase
        .from('connections')
        .select('following_id')
        .eq('follower_id', user.id)
      setConnections(conns || [])
    }
    init()
  }, [])

  async function handleSearch(val) {
  setQuery(val)
  if (!val.trim()) { setResults([]); return }

  console.log('searching for:', val)
  console.log('current user id:', user?.id)

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, bio, location')
    .or(`username.ilike.%${val}%,full_name.ilike.%${val}%`)
    .neq('id', user?.id)
    .limit(10)

  console.log('results:', data)
  console.log('error:', error)

  setResults(data || [])
}

  function isFollowing(userId) {
    return connections.some(c => c.following_id === userId)
  }

  async function handleConnect(profileId) {
    setLoading(true)

    if (isFollowing(profileId)) {
      await supabase
        .from('connections')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profileId)
      setConnections(prev => prev.filter(c => c.following_id !== profileId))
    } else {
      await supabase
        .from('connections')
        .insert({ follower_id: user.id, following_id: profileId })
      setConnections(prev => [...prev, { following_id: profileId }])
    }

    setLoading(false)
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      <div style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
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
          <button onClick={() => router.push('/films')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Log a Film</button>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Dashboard</button>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Find Reelmates</h1>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>Search for people by name or username.</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or username..."
            style={{ width: '100%', padding: '14px 18px', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '15px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#7C3AED'}
            onBlur={e => e.target.style.borderColor = '#e0e0e0'}
          />
        </div>

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map(profile => (
              <div key={profile.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', border: '1px solid #f0f0f0', borderRadius: '10px', background: '#fff' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F3EEFF', border: '2px solid #7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', color: '#7C3AED', flexShrink: 0 }}>
                  {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>
                    {profile.full_name || profile.username}
                  </div>
                  <div style={{ fontSize: '13px', color: '#888', marginBottom: profile.bio ? '4px' : '0' }}>
                    @{profile.username}{profile.location ? ` · ${profile.location}` : ''}
                  </div>
                  {profile.bio && (
                    <div style={{ fontSize: '13px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {profile.bio}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleConnect(profile.id)}
                  disabled={loading}
                  style={{ background: isFollowing(profile.id) ? '#F0FDF4' : '#7C3AED', color: isFollowing(profile.id) ? '#166534' : '#fff', border: isFollowing(profile.id) ? '1px solid #BBF7D0' : 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.15s' }}
                >
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

        {!query && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#ccc' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#ccc', marginBottom: '6px' }}>Find your people</div>
            <div style={{ fontSize: '13px', color: '#ddd' }}>Search for other Reelmates to connect with</div>
          </div>
        )}

      </div>
    </div>
  )
}