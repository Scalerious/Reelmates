'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Feed() {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: connections } = await supabase
        .from('connections')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = (connections || []).map(c => c.following_id)
      const allIds = [...followingIds, user.id]

      const { data: logs } = await supabase
        .from('film_logs')
        .select(`
          id,
          title,
          poster_path,
          rating,
          review,
          logged_at,
          user_id,
          profiles (
            id,
            username,
            full_name
          )
        `)
        .in('user_id', allIds)
        .order('logged_at', { ascending: false })
        .limit(50)

      setPosts(logs || [])
      setLoading(false)
    }
    init()
  }, [])

  function timeAgo(dateString) {
    const now = new Date()
    const date = new Date(dateString)
    const seconds = Math.floor((now - date) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
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
          <button onClick={() => router.push('/users')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Find Reelmates</button>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Dashboard</button>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111', margin: '0 0 6px', letterSpacing: '-0.5px' }}>My Feed</h1>
            <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>What your Reelmates are watching.</p>
          </div>
          <button
            onClick={() => router.push('/users')}
            style={{ background: '#7C3AED', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + Find Reelmates
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '14px', color: '#aaa' }}>Loading your feed...</div>
          </div>
        )}

        {!loading && posts.length === 0 && (
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
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#ccc', marginBottom: '8px' }}>Your feed is empty</div>
            <div style={{ fontSize: '14px', color: '#ddd', marginBottom: '24px' }}>Connect with other Reelmates to see what they're watching.</div>
            <button
              onClick={() => router.push('/users')}
              style={{ background: '#7C3AED', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Find Reelmates →
            </button>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {posts.map(post => (
              <div key={post.id} style={{ border: '1px solid #f0f0f0', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#F3EEFF', border: '2px solid #7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#7C3AED', flexShrink: 0 }}>
                    {post.profiles?.full_name ? post.profiles.full_name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>
                      {post.profiles?.full_name || post.profiles?.username}
                      {post.user_id === user.id && <span style={{ fontSize: '11px', color: '#A78BFA', marginLeft: '6px', fontWeight: '600' }}>you</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>
                      @{post.profiles?.username} · {timeAgo(post.logged_at)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', padding: '16px' }}>
                  {post.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w185${post.poster_path}`}
                      alt={post.title}
                      style={{ width: '70px', height: '105px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: '70px', height: '105px', borderRadius: '6px', background: '#F3EEFF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎬</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '17px', fontWeight: '800', color: '#111', marginBottom: '6px', letterSpacing: '-0.3px' }}>{post.title}</div>
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '10px' }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <span key={n} style={{ fontSize: '16px', color: n <= post.rating ? '#7C3AED' : '#e0e0e0' }}>★</span>
                      ))}
                    </div>
                    {post.review && (
                      <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.55', fontStyle: 'italic' }}>
                        "{post.review}"
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: '10px 16px 14px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => router.push('/films')}
                    style={{ background: '#F3EEFF', border: '1px solid #DDD6FE', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', color: '#7C3AED', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + Log this film
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