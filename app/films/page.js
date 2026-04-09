'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Films() {
  const [user, setUser] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedFilm, setSelectedFilm] = useState(null)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [logging, setLogging] = useState(false)
  const [loggedFilms, setLoggedFilms] = useState([])
  const [success, setSuccess] = useState(null)
  const [watchlist, setWatchlist] = useState([])
  const [addingToWatchlist, setAddingToWatchlist] = useState(false)
  const [connections, setConnections] = useState([])
  const [taggedMate, setTaggedMate] = useState(null)
  const [showTagPanel, setShowTagPanel] = useState(false)
  const searchTimer = useRef(null)
  const router = useRouter()
  const supabase = createClient()

useEffect(() => {
  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)

    const { data: logs } = await supabase
      .from('film_logs')
      .select('tmdb_id, rating')
      .eq('user_id', user.id)
    setLoggedFilms(logs || [])

    const { data: wl } = await supabase
      .from('watchlist')
      .select('tmdb_id')
      .eq('user_id', user.id)
    setWatchlist(wl || [])

    const { data: conns } = await supabase
      .from('connections')
      .select(`
        following_id,
        profiles!connections_following_id_fkey (
          id,
          username,
          full_name
        )
      `)
      .eq('follower_id', user.id)
    setConnections((conns || []).map(c => c.profiles).filter(Boolean))
  }
  init()
}, [])

  function handleSearch(val) {
    setQuery(val)
    clearTimeout(searchTimer.current)
    if (!val.trim()) { setResults([]); return }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`)
      const data = await res.json()
      setResults(data.results || [])
      setSearching(false)
    }, 400)
  }

  function selectFilm(film) {
    router.push(`/film/${film.id}`)
  }

  async function handleLog() {
    if (!rating) return
    setLogging(true)

    const { error } = await supabase
      .from('film_logs')
      .upsert({
        user_id: user.id,
        tmdb_id: selectedFilm.id,
        title: selectedFilm.title,
        poster_path: selectedFilm.poster
          ? selectedFilm.poster.replace('https://image.tmdb.org/t/p/w185', '')
          : null,
        rating,
        review
      }, { onConflict: 'user_id,tmdb_id' })

    if (error) {
      console.log('log error:', error)
      alert('Error: ' + error.message)
    } else {
      setSuccess(selectedFilm.title)
      setLoggedFilms(prev => {
        const filtered = prev.filter(l => l.tmdb_id !== selectedFilm.id)
        return [...filtered, { tmdb_id: selectedFilm.id, rating }]
      })
    }
    setLogging(false)
  }

  function isLogged(tmdbId) {
    return loggedFilms.some(l => l.tmdb_id === tmdbId)
  }
function isOnWatchlist(tmdbId) {
  return watchlist.some(w => w.tmdb_id === tmdbId)
}

async function handleWatchlist(suggestedBy = null) {
  if (!selectedFilm) return
  setAddingToWatchlist(true)

  if (isOnWatchlist(selectedFilm.id)) {
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('tmdb_id', selectedFilm.id)

    if (!error) {
      setWatchlist(prev => prev.filter(w => w.tmdb_id !== selectedFilm.id))
    }
  } else {
    const { error } = await supabase
      .from('watchlist')
      .upsert({
        user_id: user.id,
        tmdb_id: selectedFilm.id,
        title: selectedFilm.title,
        poster_path: selectedFilm.poster
          ? selectedFilm.poster.replace('https://image.tmdb.org/t/p/w185', '')
          : null,
        suggested_by: suggestedBy
      }, { onConflict: 'user_id,tmdb_id' })

    if (!error) {
      setWatchlist(prev => [...prev, { tmdb_id: selectedFilm.id }])
    } else {
      console.log('watchlist error:', error)
    }
  }

  setAddingToWatchlist(false)
  setShowTagPanel(false)
  setTaggedMate(null)
}
  function getLoggedRating(tmdbId) {
    return loggedFilms.find(l => l.tmdb_id === tmdbId)?.rating || 0
  }

  if (!user) return null

  const ratingLabels = ['', "Didn't like it", 'It was okay', 'Liked it', 'Really liked it', 'Loved it']

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
          <button onClick={() => router.push('/feed')} style={{ background: '#7C3AED', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', color: '#fff' }}>Say Something</button>
          <button onClick={() => router.push('/films')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Log a Film</button>
          <button onClick={() => router.push('/users')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Find Reelmates</button>
          <button onClick={() => router.push('/profile')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Profile</button>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Log a film</h1>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>Search any film and add it to your log.</p>
        </div>

        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search any film — Apocalypse Now, Parasite, Her..."
            style={{ width: '100%', padding: '14px 18px', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '15px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#7C3AED'}
            onBlur={e => e.target.style.borderColor = '#e0e0e0'}
          />
          {searching && (
            <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#A78BFA', fontSize: '13px' }}>
              Searching...
            </div>
          )}
        </div>

        {results.length > 0 && !selectedFilm && (
          <div style={{ border: '1px solid #f0f0f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' }}>
            {results.map((film, i) => (
              <div
                key={film.id}
                onClick={() => selectFilm(film)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid #f0f0f0' : 'none', background: '#fff', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                {film.poster
                  ? <img src={film.poster} alt={film.title} style={{ width: '36px', height: '54px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '36px', height: '54px', borderRadius: '4px', background: '#F3EEFF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎬</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.title}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{film.year}</div>
                </div>
                {isLogged(film.id) && (
                  <div style={{ fontSize: '11px', background: '#F3EEFF', color: '#7C3AED', border: '1px solid #DDD6FE', borderRadius: '999px', padding: '3px 10px', fontWeight: '600', flexShrink: 0 }}>
                    {'★'.repeat(getLoggedRating(film.id))} Logged
                  </div>
                )}
                <div style={{ color: '#ccc', fontSize: '18px', flexShrink: 0 }}>›</div>
              </div>
            ))}
          </div>
        )}

        {selectedFilm && (
          <div style={{ border: '1px solid #e0e0e0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: '16px', padding: '20px', borderBottom: '1px solid #f0f0f0', alignItems: 'flex-start' }}>
              {selectedFilm.poster
                ? <img src={selectedFilm.poster} alt={selectedFilm.title} style={{ width: '60px', height: '90px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: '60px', height: '90px', borderRadius: '6px', background: '#F3EEFF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎬</div>
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#111', marginBottom: '4px', letterSpacing: '-0.3px' }}>{selectedFilm.title}</div>
                <div style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>{selectedFilm.year}</div>
                {selectedFilm.overview && (
                  <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {selectedFilm.overview}
                  </div>
                )}
              </div>
              <button onClick={() => { setSelectedFilm(null); setSuccess(null) }} style={{ background: 'none', border: 'none', color: '#ccc', fontSize: '20px', cursor: 'pointer', flexShrink: 0, padding: '0' }}>✕</button>
            </div>

            {success && (
              <div style={{ padding: '20px', background: '#F0FDF4', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>✓</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#166534' }}>{success} logged!</div>
                  <div style={{ fontSize: '12px', color: '#4ADE80' }}>Added to your film log.</div>
                </div>
                <button onClick={() => { setSelectedFilm(null); setQuery(''); setResults([]); setSuccess(null) }} style={{ marginLeft: 'auto', background: '#2E8B57', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Log another
                </button>
              </div>
            )}

            {!success && (
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#111', marginBottom: '12px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Your rating</div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setRating(n)}
                        style={{ fontSize: '32px', background: 'none', border: 'none', cursor: 'pointer', color: n <= rating ? '#7C3AED' : '#e0e0e0', padding: '0', transition: 'color 0.1s, transform 0.1s', transform: n <= rating ? 'scale(1.1)' : 'scale(1)' }}
                      >★</button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <div style={{ fontSize: '13px', color: '#7C3AED', fontWeight: '600' }}>{ratingLabels[rating]}</div>
                  )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#111', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Review <span style={{ color: '#aaa', fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>— optional</span>
                  </label>
                  <textarea
                    value={review}
                    onChange={e => setReview(e.target.value)}
                    placeholder="What did you think?"
                    rows={3}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', lineHeight: '1.5' }}
                    onFocus={e => e.target.style.borderColor = '#7C3AED'}
                    onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                  />
                </div>

                <button
  onClick={handleLog}
  disabled={!rating || logging}
  style={{ width: '100%', background: !rating ? '#e0e0e0' : logging ? '#A78BFA' : '#7C3AED', color: !rating ? '#aaa' : '#fff', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: !rating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s', marginBottom: '10px' }}
>
  {logging ? 'Logging...' : rating ? `Log "${selectedFilm.title}" →` : 'Select a rating first'}
</button>
{isOnWatchlist(selectedFilm.id) ? (
  <button
    onClick={() => handleWatchlist()}
    disabled={addingToWatchlist}
    style={{ width: '100%', background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '13px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
  >
    {addingToWatchlist ? 'Removing...' : '✓ On your watchlist — tap to remove'}
  </button>
) : showTagPanel ? (
  <div style={{ border: '1px solid #DDD6FE', borderRadius: '10px', padding: '14px', background: '#F3EEFF' }}>
    <div style={{ fontSize: '11px', fontWeight: '700', color: '#6D28D9', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      Tag a Reelmate — optional
    </div>
    {connections.length === 0 ? (
      <div style={{ fontSize: '13px', color: '#A78BFA', marginBottom: '12px' }}>You're not following anyone yet.</div>
    ) : (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '12px' }}>
        {connections.map(mate => (
          <button
            key={mate.id}
            type="button"
            onClick={() => setTaggedMate(taggedMate === mate.id ? null : mate.id)}
            style={{ background: taggedMate === mate.id ? '#7C3AED' : '#fff', color: taggedMate === mate.id ? '#fff' : '#6D28D9', border: `1px solid ${taggedMate === mate.id ? '#7C3AED' : '#DDD6FE'}`, borderRadius: '999px', padding: '5px 13px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
          >
            @{mate.username}
          </button>
        ))}
      </div>
    )}
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={() => handleWatchlist(taggedMate)}
        disabled={addingToWatchlist}
        style={{ flex: 1, background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {addingToWatchlist ? 'Saving...' : 'Save to Watchlist'}
      </button>
      <button
        type="button"
        onClick={() => { setShowTagPanel(false); setTaggedMate(null) }}
        style={{ background: 'none', border: '1px solid #DDD6FE', borderRadius: '8px', padding: '11px 14px', fontSize: '13px', color: '#A78BFA', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Cancel
      </button>
    </div>
  </div>
) : (
  <button
    onClick={() => setShowTagPanel(true)}
    style={{ width: '100%', background: '#F3EEFF', color: '#6D28D9', border: '1px solid #DDD6FE', borderRadius: '8px', padding: '13px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
  >
    + Add to Watchlist
  </button>
)}
              </div>
            )}
          </div>
        )}

        {!query && !selectedFilm && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#ccc' }}>
            <svg width="48" height="48" viewBox="0 0 80 80" style={{ marginBottom: '16px', opacity: 0.3 }}>
              <rect x="4" y="4" width="52" height="42" rx="10" fill="#111111"/>
              <path d="M14 46 L10 62 L28 46Z" fill="#111111"/>
              <circle cx="18" cy="25" r="4" fill="#ffffff"/>
              <circle cx="30" cy="25" r="4" fill="#ffffff"/>
              <circle cx="42" cy="25" r="4" fill="#ffffff"/>
              <circle cx="58" cy="56" r="18" fill="#7C3AED"/>
              <path d="M52 47 L52 65 L70 56Z" fill="#ffffff"/>
            </svg>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#ccc', marginBottom: '6px' }}>Search any film to get started</div>
            <div style={{ fontSize: '13px', color: '#ddd' }}>Powered by TMDB</div>
          </div>
        )}

      </div>
    </div>
  )
}