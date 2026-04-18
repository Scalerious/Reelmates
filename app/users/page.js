'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import MiniProfile from '../components/MiniProfile'
import NavNotifButton from '../components/NavNotifButton'

// Compute 0–100 taste compatibility between two users
function computeCompatibility(myLogs, myFavs, theirLogs, theirFavs) {
  const myLogMap = Object.fromEntries(myLogs.map(l => [l.tmdb_id, l.rating]))
  const theirLogMap = Object.fromEntries(theirLogs.map(l => [l.tmdb_id, l.rating]))
  const myIds = new Set(myLogs.map(l => l.tmdb_id))
  const theirIds = new Set(theirLogs.map(l => l.tmdb_id))

  // 1. Jaccard similarity of logged films (50%)
  const shared = [...myIds].filter(id => theirIds.has(id))
  const unionSize = new Set([...myIds, ...theirIds]).size
  const overlapScore = unionSize > 0 ? shared.length / unionSize : 0

  // 2. Rating alignment on shared films (30%)
  let ratingScore = 0.5 // neutral if no shared films
  if (shared.length > 0) {
    const alignments = shared.map(id => 1 - Math.abs((myLogMap[id] || 3) - (theirLogMap[id] || 3)) / 4)
    ratingScore = alignments.reduce((a, b) => a + b, 0) / alignments.length
  }

  // 3. Shared favorites (20%)
  const myFavIds = new Set((myFavs || []).filter(Boolean).map(f => f?.tmdb_id).filter(Boolean))
  const theirFavIds = new Set((theirFavs || []).filter(Boolean).map(f => f?.tmdb_id).filter(Boolean))
  const sharedFavs = [...myFavIds].filter(id => theirFavIds.has(id)).length
  const totalFavs = new Set([...myFavIds, ...theirFavIds]).size
  const favScore = totalFavs > 0 ? sharedFavs / totalFavs : 0

  return Math.round((overlapScore * 0.5 + ratingScore * 0.3 + favScore * 0.2) * 100)
}

function compatibilityColor(pct) {
  if (pct >= 75) return '#7C3AED'
  if (pct >= 50) return '#A78BFA'
  if (pct >= 25) return '#C4B5FD'
  return '#DDD6FE'
}

function compatibilityLabel(pct) {
  if (pct >= 85) return 'Cinematic soulmates'
  if (pct >= 70) return 'Strong taste overlap'
  if (pct >= 50) return 'Good match'
  if (pct >= 30) return 'Some common ground'
  return 'Different tastes'
}

export default function Users() {
  const [user, setUser] = useState(null)
  const [reelmates, setReelmates] = useState([])
  const [filtered, setFiltered] = useState([])
  const [query, setQuery] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [confirmUnfriend, setConfirmUnfriend] = useState(null) // id pending confirm
  const [unfriending, setUnfriending] = useState(null) // id currently being removed
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      // Get connected reelmate IDs
      const { data: conns } = await supabase
        .from('connections')
        .select('following_id')
        .eq('follower_id', user.id)

      const reelmateIds = (conns || []).map(c => c.following_id)

      if (reelmateIds.length === 0) {
        setPageLoading(false)
        return
      }

      // Fetch reelmate profiles + my profile (for favorites), all logs in parallel
      const [{ data: reelmateProfiles }, { data: myProfile }, { data: allLogs }] = await Promise.all([
        supabase.from('profiles')
          .select('id, username, full_name, bio, location, avatar_url, email, favorite_films')
          .in('id', reelmateIds),
        supabase.from('profiles')
          .select('favorite_films')
          .eq('id', user.id)
          .single(),
        supabase.from('film_logs')
          .select('user_id, tmdb_id, rating')
          .in('user_id', [...reelmateIds, user.id])
      ])

      const myLogs = (allLogs || []).filter(l => l.user_id === user.id)
      const myFavs = myProfile?.favorite_films || []

      // Group logs by reelmate
      const logsByUser = {}
      for (const log of (allLogs || [])) {
        if (!logsByUser[log.user_id]) logsByUser[log.user_id] = []
        logsByUser[log.user_id].push(log)
      }

      // Compute compatibility for each reelmate and attach
      const withScores = (reelmateProfiles || []).map(rm => {
        const theirLogs = logsByUser[rm.id] || []
        const theirFavs = rm.favorite_films || []
        const hasData = myLogs.length > 0 || theirLogs.length > 0 || myFavs.length > 0 || theirFavs.length > 0
        const score = hasData ? computeCompatibility(myLogs, myFavs, theirLogs, theirFavs) : null
        return { ...rm, score, sharedCount: (logsByUser[rm.id] || []).filter(l => myLogs.some(m => m.tmdb_id === l.tmdb_id)).length }
      }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1))

      setReelmates(withScores)
      setFiltered(withScores)
      setPageLoading(false)
    }
    init()
  }, [])

  function handleSearch(val) {
    setQuery(val)
    if (!val.trim()) { setFiltered(reelmates); return }
    const q = val.toLowerCase()
    setFiltered(reelmates.filter(r =>
      (r.full_name || '').toLowerCase().includes(q) ||
      (r.username || '').toLowerCase().includes(q)
    ))
  }

  async function handleUnfriend(rmId) {
    setUnfriending(rmId)
    await supabase.from('connections').delete().eq('follower_id', user.id).eq('following_id', rmId)
    const updated = reelmates.filter(r => r.id !== rmId)
    setReelmates(updated)
    setFiltered(updated.filter(r => !query.trim() ||
      (r.full_name || '').toLowerCase().includes(query.toLowerCase()) ||
      (r.username || '').toLowerCase().includes(query.toLowerCase())
    ))
    setConfirmUnfriend(null)
    setUnfriending(null)
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

        <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111', margin: '0 0 4px', letterSpacing: '-0.5px' }}>My Reelmates</h1>
            <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
              {pageLoading ? 'Loading…' : `${reelmates.length} connected`}
            </p>
          </div>
          <button onClick={() => router.push('/users/find')}
            style={{ background: '#7C3AED', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            + Find People
          </button>
        </div>

        {/* Search within reelmates */}
        {reelmates.length > 3 && (
          <div style={{ marginBottom: '24px' }}>
            <input
              type="text"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Filter by name…"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#7C3AED'}
              onBlur={e => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>
        )}

        {pageLoading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa', fontSize: '14px' }}>Loading your reelmates…</div>
        )}

        {!pageLoading && reelmates.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎬</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#ccc', marginBottom: '8px' }}>No reelmates yet</div>
            <div style={{ fontSize: '14px', color: '#ddd', marginBottom: '24px' }}>Connect with people to see them here.</div>
            <button onClick={() => router.push('/users/find')}
              style={{ background: '#7C3AED', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              Find people to connect with →
            </button>
          </div>
        )}

        {!pageLoading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(rm => {
              const name = rm.full_name || rm.username || rm.email || 'Reelmate'
              const initials = name.charAt(0).toUpperCase()
              const score = rm.score
              const color = score !== null ? compatibilityColor(score) : '#e0e0e0'

              return (
                <div key={rm.id}
                  onClick={() => router.push(rm.username ? `/${rm.username}` : `/profile/${rm.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', border: '1px solid #f0f0f0', borderRadius: '12px', background: '#fff', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#DDD6FE'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(124,58,237,0.07)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.boxShadow = 'none' }}>

                  {/* Avatar */}
                  {rm.avatar_url ? (
                    <img src={rm.avatar_url} alt={name} style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #DDD6FE', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#F3EEFF', border: '2px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', color: '#7C3AED', flexShrink: 0 }}>
                      {initials}
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>{name}</div>
                    {(rm.username || rm.location) && (
                      <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>
                        {rm.username ? `@${rm.username}` : ''}{rm.username && rm.location ? ' · ' : ''}{rm.location || ''}
                      </div>
                    )}

                    {/* Compatibility bar */}
                    {score !== null ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <div style={{ flex: 1, height: '5px', background: '#F3EEFF', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.6s ease' }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color, flexShrink: 0 }}>{score}%</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#A78BFA', fontWeight: '600' }}>
                          {compatibilityLabel(score)} · {rm.sharedCount} film{rm.sharedCount !== 1 ? 's' : ''} in common
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#ccc', fontStyle: 'italic' }}>Log some films to see compatibility</div>
                    )}
                  </div>

                  {/* Unfriend — small, two-step confirm */}
                  <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0, alignSelf: 'center' }}>
                    {confirmUnfriend === rm.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#aaa' }}>Remove reelmate?</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleUnfriend(rm.id)}
                            disabled={unfriending === rm.id}
                            style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', fontWeight: '700', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>
                            {unfriending === rm.id ? '…' : 'Yes, remove'}
                          </button>
                          <button
                            onClick={() => setConfirmUnfriend(null)}
                            style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', color: '#aaa', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmUnfriend(rm.id)}
                        style={{ background: 'none', border: 'none', fontSize: '11px', color: '#ccc', cursor: 'pointer', fontFamily: 'inherit', padding: '4px', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#aaa'}
                        onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!pageLoading && query && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#ccc', fontSize: '14px' }}>
            No reelmates match "{query}"
          </div>
        )}

      </div>
    </div>
  )
}
