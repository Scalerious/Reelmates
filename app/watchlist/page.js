'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import MiniProfile from '../components/MiniProfile'
import NavNotifButton from '../components/NavNotifButton'

export default function Watchlist() {
  const [user, setUser] = useState(null)
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data } = await supabase
        .from('watchlist')
        .select(`
          id,
          tmdb_id,
          title,
          poster_path,
          added_at,
          suggested_by,
          profiles!watchlist_suggested_by_fkey (
            username,
            full_name
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false })

      setWatchlist(data || [])
      setLoading(false)
    }
    init()
  }, [])

  async function handleRemove(id) {
    await supabase
      .from('watchlist')
      .delete()
      .eq('id', id)

    setWatchlist(prev => prev.filter(w => w.id !== id))
  }

  function timeAgo(dateString) {
    const now = new Date()
    const date = new Date(dateString)
    const days = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return `${Math.floor(days / 30)} months ago`
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

        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111', margin: '0 0 6px', letterSpacing: '-0.5px' }}>My Watchlist</h1>
            <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
              {loading ? 'Loading...' : `${watchlist.length} film${watchlist.length !== 1 ? 's' : ''} saved`}
            </p>
          </div>
          <button
            onClick={() => router.push('/films')}
            style={{ background: '#7C3AED', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + Add Films
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa', fontSize: '14px' }}>
            Loading your watchlist...
          </div>
        )}

        {!loading && watchlist.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <svg width="64" height="64" viewBox="0 0 80 80" style={{ marginBottom: '20px', opacity: 0.2 }}>
              <rect x="4" y="4" width="52" height="42" rx="10" fill="#111111"/>
              <path d="M14 46 L10 62 L28 46Z" fill="#111111"/>
              <circle cx="18" cy="25" r="4" fill="#ffffff"/>
              <circle cx="30" cy="25" r="4" fill="#ffffff"/>
              <circle cx="42" cy="25" r="4" fill="#ffffff"/>
              <circle cx="58" cy="56" r="18" fill="#7C3AED"/>
              <path d="M52 47 L52 65 L70 56Z" fill="#ffffff"/>
            </svg>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#ccc', marginBottom: '8px' }}>Your watchlist is empty</div>
            <div style={{ fontSize: '14px', color: '#ddd', marginBottom: '24px' }}>Search for films and save them for later.</div>
            <button
              onClick={() => router.push('/films')}
              style={{ background: '#7C3AED', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Find films to watch →
            </button>
          </div>
        )}

        {!loading && watchlist.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {watchlist.map((item, i) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid #f0f0f0', borderRadius: '12px', background: '#fff', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#DDD6FE'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#f0f0f0'}
              >
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#DDD6FE', minWidth: '28px', textAlign: 'center' }}>
                  {i + 1}
                </div>

                <div onClick={() => item.tmdb_id && router.push(`/film/${item.tmdb_id}`)} style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1, minWidth: 0, cursor: item.tmdb_id ? 'pointer' : 'default' }}>
                  {item.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                      alt={item.title}
                      style={{ width: '48px', height: '72px', borderRadius: '5px', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: '48px', height: '72px', borderRadius: '5px', background: '#F3EEFF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎬</div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#111', marginBottom: '4px' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: '#aaa', marginBottom: item.profiles ? '4px' : '0' }}>
                      Added {timeAgo(item.added_at)}
                    </div>
                    {item.profiles && (
                      <div style={{ fontSize: '12px', color: '#A78BFA', fontWeight: '600' }}>
                        Suggested by @{item.profiles.username}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => item.tmdb_id ? router.push(`/film/${item.tmdb_id}`) : router.push('/films')}
                    style={{ background: '#7C3AED', border: 'none', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Log it
                  </button>
                  <button
                    onClick={() => handleRemove(item.id)}
                    style={{ background: 'none', border: '1px solid #f0f0f0', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', color: '#ccc', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}