'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import MiniProfile from '../../components/MiniProfile'
import NavNotifButton from '../../components/NavNotifButton'

function StarDisplay({ rating, size = 12, color = '#7C3AED' }) {
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }}>
      {[1, 2, 3, 4, 5].map(n => {
        const fill = Math.min(1, Math.max(0, rating - (n - 1)))
        return (
          <span key={n} style={{ position: 'relative', display: 'inline-block', fontSize: `${size}px`, lineHeight: 1, color: '#e0e0e0' }}>
            ★
            <span style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: `${fill * 100}%`, color, whiteSpace: 'nowrap' }}>★</span>
          </span>
        )
      })}
    </span>
  )
}

export default function PublicProfile() {
  const [me, setMe] = useState(null)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ logs: 0, watchlist: 0, connections: 0 })
  const [favorites, setFavorites] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [watchlistItems, setWatchlistItems] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [confirmUnfriend, setConfirmUnfriend] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { user_id } = useParams()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      // Redirect to own profile page if visiting yourself
      if (user.id === user_id) { router.replace('/profile'); return }
      setMe(user)

      const [
        { data: profile },
        { count: logCount },
        { count: wlCount },
        { count: connCount },
        { data: logs },
        { data: wlItems },
        { data: conn }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user_id).single(),
        supabase.from('film_logs').select('*', { count: 'exact', head: true }).eq('user_id', user_id),
        supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('user_id', user_id),
        supabase.from('connections').select('*', { count: 'exact', head: true }).eq('follower_id', user_id),
        supabase.from('film_logs').select('tmdb_id, title, poster_path, rating').eq('user_id', user_id).order('logged_at', { ascending: false }).limit(12),
        supabase.from('watchlist').select('id, title, poster_path').eq('user_id', user_id).order('added_at', { ascending: false }).limit(12),
        supabase.from('connections').select('id').eq('follower_id', user.id).eq('following_id', user_id).maybeSingle()
      ])

      setProfile(profile)
      setStats({ logs: logCount || 0, watchlist: wlCount || 0, connections: connCount || 0 })
      const stored = profile?.favorite_films || []
      setFavorites(stored.filter(Boolean))
      setRecentLogs(logs || [])
      setWatchlistItems(wlItems || [])
      setIsFollowing(!!conn)
      setLoading(false)
    }
    init()
  }, [user_id])

  async function handleConnect() {
    setConnecting(true)
    if (isFollowing) {
      await supabase.from('connections').delete().eq('follower_id', me.id).eq('following_id', user_id)
      setIsFollowing(false)
      setConfirmUnfriend(false)
    } else {
      await supabase.from('connections').insert({ follower_id: me.id, following_id: user_id })
      setIsFollowing(true)
    }
    setConnecting(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ fontSize: '14px', color: '#aaa' }}>Loading…</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ fontSize: '14px', color: '#aaa' }}>User not found.</div>
      </div>
    )
  }

  const displayName = profile.full_name || profile.username || profile.email || 'Reelmate'
  const displayUsername = profile.username || profile.email || ''

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Navbar */}
      <div style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Profile hero */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '28px', marginBottom: '48px' }}>
          {/* Avatar */}
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName}
              style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #7C3AED', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#F3EEFF', border: '3px solid #7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '800', color: '#7C3AED', flexShrink: 0 }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#111', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{displayName}</div>
              {isFollowing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', fontWeight: '700', color: '#166534' }}>✓ Connected</span>
                  {confirmUnfriend ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#aaa' }}>Remove reelmate?</span>
                      <button onClick={handleConnect} disabled={connecting}
                        style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', fontWeight: '700', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {connecting ? '…' : 'Yes, remove'}
                      </button>
                      <button onClick={() => setConfirmUnfriend(false)}
                        style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', color: '#aaa', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmUnfriend(true)}
                      style={{ background: 'none', border: 'none', fontSize: '11px', color: '#ccc', cursor: 'pointer', fontFamily: 'inherit', padding: '4px', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#aaa'}
                      onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                      Remove
                    </button>
                  )}
                </div>
              ) : (
                <button onClick={handleConnect} disabled={connecting}
                  style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  {connecting ? '…' : '+ Connect'}
                </button>
              )}
            </div>
            {displayUsername && <div style={{ fontSize: '14px', color: '#A78BFA', fontWeight: '600', marginBottom: '8px' }}>@{displayUsername}</div>}
            {profile.bio && <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '8px' }}>{profile.bio}</div>}
            {profile.location && <div style={{ fontSize: '13px', color: '#aaa' }}>📍 {profile.location}</div>}

            {/* Stats */}
            <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#7C3AED', lineHeight: 1 }}>{stats.logs}</div>
                <div style={{ fontSize: '11px', color: '#aaa', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Films</div>
              </div>
              <div style={{ width: '1px', background: '#f0f0f0' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#7C3AED', lineHeight: 1 }}>{stats.watchlist}</div>
                <div style={{ fontSize: '11px', color: '#aaa', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Watchlist</div>
              </div>
              <div style={{ width: '1px', background: '#f0f0f0' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#7C3AED', lineHeight: 1 }}>{stats.connections}</div>
                <div style={{ fontSize: '11px', color: '#aaa', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reelmates</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top 4 Favorites */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>Top 4 favorites</div>
            <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>The films that define their taste</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[...favorites, null, null, null, null].slice(0, 4).map((film, i) => (
              <div key={i}
                onClick={() => film?.tmdb_id && router.push(`/film/${film.tmdb_id}`)}
                style={{ cursor: film?.tmdb_id ? 'pointer' : 'default' }}
                onMouseEnter={e => { if (film?.tmdb_id) e.currentTarget.style.opacity = '0.8' }}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                {film?.poster_path ? (
                  <img src={`https://image.tmdb.org/t/p/w185${film.poster_path}`} alt={film.title}
                    style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '2/3', background: '#F3EEFF', border: '2px dashed #DDD6FE', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#DDD6FE' }}>🎬</div>
                )}
                {film?.title && <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: '600', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{film.title}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Recently Logged */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>Recently Logged</div>
            <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>Their latest film ratings</div>
          </div>
          {recentLogs.length === 0 ? (
            <div style={{ border: '1px dashed #e0e0e0', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#ccc' }}>No films logged yet</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
              {recentLogs.map(film => (
                <div key={film.tmdb_id} style={{ position: 'relative', cursor: 'pointer' }}
                  onClick={() => router.push(`/film/${film.tmdb_id}`)}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  {film.poster_path
                    ? <img src={`https://image.tmdb.org/t/p/w185${film.poster_path}`} alt={film.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                    : <div style={{ width: '100%', aspectRatio: '2/3', background: '#F3EEFF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎬</div>
                  }
                  {film.rating > 0 && (
                    <div style={{ position: 'absolute', bottom: '6px', left: '4px', right: '4px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: '4px', padding: '2px 5px', fontSize: '9px', color: '#fff', fontWeight: '700' }}>
                        {film.rating}★
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Watchlist */}
        <div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>Watchlist</div>
            <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>Films on their radar</div>
          </div>
          {watchlistItems.length === 0 ? (
            <div style={{ border: '1px dashed #e0e0e0', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#ccc' }}>Nothing on their watchlist yet</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
              {watchlistItems.map(item => (
                <div key={item.id}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  {item.poster_path
                    ? <img src={`https://image.tmdb.org/t/p/w185${item.poster_path}`} alt={item.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                    : <div style={{ width: '100%', aspectRatio: '2/3', background: '#F3EEFF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎬</div>
                  }
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
