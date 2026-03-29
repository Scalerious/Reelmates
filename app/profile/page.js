'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [filmLogs, setFilmLogs] = useState([])
  const [recentFilms, setRecentFilms] = useState([])
  const [favorites, setFavorites] = useState([null, null, null, null])
  const [pickingSlot, setPickingSlot] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setProfile(profile)
        setUsername(profile.username || '')
        setFullName(profile.full_name || '')
        setBio(profile.bio || '')
        setLocation(profile.location || '')
        if (profile.favorite_films) {
          setFavorites(profile.favorite_films)
        }
      }

      const { data: logs } = await supabase
        .from('film_logs')
        .select('tmdb_id, title, poster_path, rating, logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })

      setFilmLogs(logs || [])
      setRecentFilms((logs || []).slice(0, 4))
    }
    init()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        username,
        full_name: fullName,
        bio,
        location,
        favorite_films: favorites
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
    } else {
      setMessage('Profile saved!')
    }
    setSaving(false)
  }

  function pickFavorite(film) {
    if (pickingSlot === null) return
    const updated = [...favorites]
    updated[pickingSlot] = film
    setFavorites(updated)
    setPickingSlot(null)
  }

  function removeFavorite(slot) {
    const updated = [...favorites]
    updated[slot] = null
    setFavorites(updated)
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Navbar */}
      <div style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Dashboard</button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#F3EEFF', border: '2px solid #7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '800', color: '#7C3AED', flexShrink: 0 }}>
            {fullName ? fullName.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>{fullName || 'Your name'}</div>
            <div style={{ fontSize: '14px', color: '#888' }}>@{username || 'username'}</div>
            {location && <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>📍 {location}</div>}
          </div>
        </div>

        {/* Top 4 Favorites */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>Top 4 favorites</div>
              <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>Choose the films that define your taste</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {favorites.map((film, slot) => (
              <div key={slot}>
                {film ? (
                  <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setPickingSlot(slot)}>
                    {film.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${film.poster_path}`}
                        alt={film.title}
                        style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '8px', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '2/3', background: '#F3EEFF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎬</div>
                    )}
                    <div style={{ position: 'absolute', bottom: '6px', left: '6px', right: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: '#fff', fontWeight: '700' }}>
                        {'★'.repeat(film.rating)}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); removeFavorite(slot) }}
                        style={{ background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '10px' }}
                      >✕</button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setPickingSlot(slot)}
                    style={{ width: '100%', aspectRatio: '2/3', background: '#F3EEFF', border: '2px dashed #DDD6FE', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '6px', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#7C3AED'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#DDD6FE'}
                  >
                    <div style={{ fontSize: '20px', color: '#A78BFA' }}>+</div>
                    <div style={{ fontSize: '10px', color: '#A78BFA', fontWeight: '600', textAlign: 'center', padding: '0 4px' }}>Pick a film</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Film picker */}
          {pickingSlot !== null && (
            <div style={{ marginTop: '16px', background: '#F3EEFF', border: '1px solid #DDD6FE', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#7C3AED' }}>Pick a film for slot {pickingSlot + 1}</div>
                <button onClick={() => setPickingSlot(null)} style={{ background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              </div>
              {filmLogs.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#A78BFA', textAlign: 'center', padding: '20px 0' }}>
                  You haven't logged any films yet. <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/films')}>Log some films first →</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                  {filmLogs.map(film => (
                    <div
                      key={film.tmdb_id}
                      onClick={() => pickFavorite(film)}
                      style={{ cursor: 'pointer', position: 'relative' }}
                    >
                      {film.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${film.poster_path}`}
                          alt={film.title}
                          style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '6px', display: 'block', transition: 'opacity 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        />
                      ) : (
                        <div style={{ width: '100%', aspectRatio: '2/3', background: '#DDD6FE', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎬</div>
                      )}
                      <div style={{ position: 'absolute', bottom: '3px', left: '3px', background: 'rgba(0,0,0,0.7)', borderRadius: '3px', padding: '1px 4px', fontSize: '9px', color: '#fff', fontWeight: '700' }}>
                        {'★'.repeat(film.rating)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent films */}
        {recentFilms.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>Recently watched</div>
              <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>Your last {recentFilms.length} logged films</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {recentFilms.map(film => (
                <div key={film.tmdb_id} style={{ position: 'relative' }}>
                  {film.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w185${film.poster_path}`}
                      alt={film.title}
                      style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '8px', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '2/3', background: '#F5F5F5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎬</div>
                  )}
                  <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.75)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: '#fff', fontWeight: '700' }}>
                    {'★'.repeat(film.rating)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit profile form */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>Edit profile</div>
            <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>This is how other Reelmates will see you</div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#111', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Full Name</label>
                <input
                  type="text" value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Mike Scalere"
                  style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#7C3AED'}
                  onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#111', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Username</label>
                <input
                  type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="scalerious"
                  style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#7C3AED'}
                  onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#111', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Location</label>
              <input
                type="text" value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="New York City"
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#7C3AED'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#111', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Filmmaker. Cinephile. Always watching something."
                rows={3}
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', lineHeight: '1.5' }}
                onFocus={e => e.target.style.borderColor = '#7C3AED'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            {message && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#166534' }}>
                {message}
              </div>
            )}

            {error && (
              <div style={{ background: '#FFF4ED', border: '1px solid #FED7AA', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#C2410C' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={saving} style={{
              background: saving ? '#A78BFA' : '#7C3AED', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
            }}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}