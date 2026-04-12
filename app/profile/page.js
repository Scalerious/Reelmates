'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import MiniProfile from '../components/MiniProfile'
import NavNotifButton from '../components/NavNotifButton'

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
  const [stats, setStats] = useState({ logs: 0, watchlist: 0, connections: 0 })
  const [recentLogs, setRecentLogs] = useState([])
  const [watchlistItems, setWatchlistItems] = useState([])
  const [favorites, setFavorites] = useState([null, null, null, null])
  const [pickingSlot, setPickingSlot] = useState(null)
  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerResults, setPickerResults] = useState([])
  const [pickerSearching, setPickerSearching] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [allLogs, setAllLogs] = useState([])
  const pickerTimer = useRef(null)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const [
        { data: profile },
        { count: logCount },
        { count: wlCount },
        { count: connCount },
        { data: logs },
        { data: wlItems },
        { data: allLogsData }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('film_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('connections').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('film_logs').select('tmdb_id, title, poster_path, rating').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(12),
        supabase.from('watchlist').select('id, title, poster_path').eq('user_id', user.id).order('added_at', { ascending: false }).limit(12),
        supabase.from('film_logs').select('tmdb_id, title, poster_path, rating, logged_at').eq('user_id', user.id).order('logged_at', { ascending: false })
      ])

      if (profile) {
        setProfile(profile)
        setUsername(profile.username || '')
        setFullName(profile.full_name || '')
        setBio(profile.bio || '')
        setLocation(profile.location || '')
        const stored = profile.favorite_films || []
        setFavorites([...stored, null, null, null, null].slice(0, 4))
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url)
      }

      setStats({ logs: logCount || 0, watchlist: wlCount || 0, connections: connCount || 0 })
      setRecentLogs(logs || [])
      setWatchlistItems(wlItems || [])
      setAllLogs(allLogsData || [])
      // Default calendar to the month of the most recent log, or today
      if (allLogsData?.length) {
        setCalendarDate(new Date(allLogsData[0].logged_at))
      }
    }
    init()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, username, full_name: fullName, bio, location, favorite_films: favorites, email: user.email
    }, { onConflict: 'id' })
    if (error) { setError(error.message) } else { setMessage('Profile saved!') }
    setSaving(false)
  }

  function openPicker(slot) {
    setPickingSlot(slot)
    setPickerQuery('')
    setPickerResults([])
  }

  function closePicker() {
    setPickingSlot(null)
    setPickerQuery('')
    setPickerResults([])
    clearTimeout(pickerTimer.current)
  }

  function handlePickerSearch(val) {
    setPickerQuery(val)
    clearTimeout(pickerTimer.current)
    if (!val.trim()) { setPickerResults([]); return }
    setPickerSearching(true)
    pickerTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`)
      const data = await res.json()
      setPickerResults(data.results || [])
      setPickerSearching(false)
    }, 400)
  }

  async function pickFavorite(film) {
    if (pickingSlot === null) return
    const updated = [...favorites]
    updated[pickingSlot] = {
      tmdb_id: film.id,
      title: film.title,
      poster_path: film.poster ? film.poster.replace('https://image.tmdb.org/t/p/w185', '') : null,
      rating: null
    }
    setFavorites(updated)
    closePicker()
    await supabase.from('profiles').upsert({ id: user.id, favorite_films: updated }, { onConflict: 'id' })
  }

  async function removeFavorite(slot) {
    const updated = [...favorites]
    updated[slot] = null
    setFavorites(updated)
    await supabase.from('profiles').upsert({ id: user.id, favorite_films: updated }, { onConflict: 'id' })
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { alert('Upload failed: ' + uploadError.message); setUploadingAvatar(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl }, { onConflict: 'id' })
    setAvatarUrl(publicUrl)
    setUploadingAvatar(false)
  }

  if (!user) return null

  const displayName = fullName || profile?.full_name || ''
  const displayUsername = username || profile?.username || user?.email || ''

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Profile hero */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '28px', marginBottom: '48px' }}>
          {/* Avatar */}
          <div
            onClick={() => avatarInputRef.current?.click()}
            style={{ position: 'relative', width: '96px', height: '96px', borderRadius: '50%', flexShrink: 0, cursor: 'pointer' }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile photo" style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #7C3AED', display: 'block' }} />
            ) : (
              <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#F3EEFF', border: '3px solid #7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '800', color: '#7C3AED' }}>
                {displayName ? displayName.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: '26px', height: '26px', borderRadius: '50%', background: uploadingAvatar ? '#A78BFA' : '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
              {uploadingAvatar ? (
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
              ) : (
                <svg width="11" height="11" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
              )}
            </div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />

          {/* Name + bio */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#111', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{displayName || 'Your name'}</div>
              <button
                onClick={() => setEditOpen(o => !o)}
                style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: '600', color: '#888', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
              >
                {editOpen ? 'Close' : 'Edit profile'}
              </button>
            </div>
            <div style={{ fontSize: '14px', color: '#A78BFA', fontWeight: '600', marginBottom: '8px' }}>@{displayUsername}</div>
            {bio && <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '8px' }}>{bio}</div>}
            {location && <div style={{ fontSize: '13px', color: '#aaa' }}>📍 {location}</div>}

            {/* Stats pills */}
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

        {/* Edit profile (collapsible) */}
        {editOpen && (
          <div style={{ background: '#FAFAFA', border: '1px solid #f0f0f0', borderRadius: '12px', padding: '28px', marginBottom: '48px' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#111', marginBottom: '20px', letterSpacing: '-0.2px' }}>Edit profile</div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#111', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Full Name</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name"
                    style={{ width: '100%', padding: '11px 13px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }}
                    onFocus={e => e.target.style.borderColor = '#7C3AED'} onBlur={e => e.target.style.borderColor = '#e0e0e0'} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#111', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Username</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username"
                    style={{ width: '100%', padding: '11px 13px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }}
                    onFocus={e => e.target.style.borderColor = '#7C3AED'} onBlur={e => e.target.style.borderColor = '#e0e0e0'} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#111', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Location</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country"
                  style={{ width: '100%', padding: '11px 13px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }}
                  onFocus={e => e.target.style.borderColor = '#7C3AED'} onBlur={e => e.target.style.borderColor = '#e0e0e0'} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#111', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell other Reelmates about your taste in film…" rows={3}
                  style={{ width: '100%', padding: '11px 13px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', lineHeight: '1.5', background: '#fff' }}
                  onFocus={e => e.target.style.borderColor = '#7C3AED'} onBlur={e => e.target.style.borderColor = '#e0e0e0'} />
              </div>

              {message && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#166534' }}>{message}</div>
              )}
              {error && (
                <div style={{ background: '#FFF4ED', border: '1px solid #FED7AA', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#C2410C' }}>{error}</div>
              )}

              <button type="submit" disabled={saving} style={{ background: saving ? '#A78BFA' : '#7C3AED', color: '#fff', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </form>
          </div>
        )}

        {/* Top 4 Favorites */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>Top 4 favorites</div>
            <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>The films that define your taste</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {favorites.map((film, slot) => (
              <div key={slot}>
                {film ? (
                  <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => film.tmdb_id ? router.push(`/film/${film.tmdb_id}`) : openPicker(slot)}>
                    {film.poster_path ? (
                      <img src={`https://image.tmdb.org/t/p/w185${film.poster_path}`} alt={film.title}
                        style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '2/3', background: '#F3EEFF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎬</div>
                    )}
                    <button type="button" onClick={e => { e.stopPropagation(); removeFavorite(slot) }}
                      style={{ position: 'absolute', top: '7px', right: '7px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '11px' }}>✕</button>
                    <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: '600', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{film.title}</div>
                  </div>
                ) : (
                  <div onClick={() => openPicker(slot)}
                    style={{ width: '100%', aspectRatio: '2/3', background: '#F3EEFF', border: '2px dashed #DDD6FE', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '6px' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#7C3AED'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#DDD6FE'}
                  >
                    <div style={{ fontSize: '22px', color: '#A78BFA' }}>+</div>
                    <div style={{ fontSize: '10px', color: '#A78BFA', fontWeight: '600', textAlign: 'center', padding: '0 6px' }}>Pick a film</div>
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
                <button type="button" onClick={closePicker} style={{ background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              </div>
              <input autoFocus type="text" value={pickerQuery} onChange={e => handlePickerSearch(e.target.value)} placeholder="Search any film…"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDD6FE', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box', color: '#111', marginBottom: '12px' }} />
              {pickerSearching && <div style={{ fontSize: '12px', color: '#A78BFA', marginBottom: '8px' }}>Searching…</div>}
              {pickerResults.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                  {pickerResults.map(film => (
                    <div key={film.id} onClick={() => pickFavorite(film)} style={{ cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.75'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                      {film.poster
                        ? <img src={film.poster} alt={film.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
                        : <div style={{ width: '100%', aspectRatio: '2/3', background: '#DDD6FE', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎬</div>
                      }
                      <div style={{ fontSize: '10px', color: '#6D28D9', fontWeight: '600', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{film.title}</div>
                    </div>
                  ))}
                </div>
              )}
              {!pickerSearching && pickerQuery && pickerResults.length === 0 && (
                <div style={{ fontSize: '13px', color: '#A78BFA', textAlign: 'center', padding: '12px 0' }}>No results for "{pickerQuery}"</div>
              )}
              {!pickerQuery && (
                <div style={{ fontSize: '13px', color: '#A78BFA', textAlign: 'center', padding: '12px 0' }}>Start typing to search any film</div>
              )}
            </div>
          )}
        </div>

        {/* Recently Logged */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ cursor: 'pointer' }} onClick={() => { setShowCalendar(true); setSelectedDay(null) }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>Recently Logged</div>
              <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>Latest film ratings · <span style={{ color: '#A78BFA' }}>view calendar →</span></div>
            </div>
            <button onClick={() => router.push('/films')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}>
              Log a film →
            </button>
          </div>
          {recentLogs.length === 0 ? (
            <div style={{ border: '1px dashed #e0e0e0', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
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
                      <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: '4px', padding: '2px 5px', fontSize: '9px', color: '#fff', fontWeight: '700', letterSpacing: '1px' }}>
                        {'★'.repeat(film.rating)}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>Watchlist</div>
              <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>Films on the radar</div>
            </div>
            <button onClick={() => router.push('/watchlist')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}>
              View all →
            </button>
          </div>
          {watchlistItems.length === 0 ? (
            <div style={{ border: '1px dashed #e0e0e0', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#ccc' }}>Watchlist is empty</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
              {watchlistItems.map(item => (
                <div key={item.id} onClick={() => router.push('/watchlist')} style={{ cursor: 'pointer' }}
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

      {/* Calendar modal */}
      {showCalendar && (() => {
        const year = calendarDate.getFullYear()
        const month = calendarDate.getMonth()
        const monthName = calendarDate.toLocaleString('default', { month: 'long' })
        const firstDayOfWeek = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const today = new Date()

        // Group all logs by YYYY-MM-DD
        const filmsByDate = {}
        allLogs.forEach(log => {
          if (!log.logged_at) return
          const d = new Date(log.logged_at)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          if (!filmsByDate[key]) filmsByDate[key] = []
          filmsByDate[key].push(log)
        })

        const cells = []
        for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
        for (let d = 1; d <= daysInMonth; d++) cells.push(d)

        const selectedKey = selectedDay
          ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
          : null
        const selectedFilms = selectedKey ? (filmsByDate[selectedKey] || []) : []

        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
            onClick={e => { if (e.target === e.currentTarget) { setShowCalendar(false); setSelectedDay(null) } }}
          >
            <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button onClick={() => { setCalendarDate(new Date(year, month - 1, 1)); setSelectedDay(null) }}
                    style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', color: '#555' }}>‹</button>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#111', minWidth: '140px', textAlign: 'center' }}>{monthName} {year}</div>
                  <button onClick={() => { setCalendarDate(new Date(year, month + 1, 1)); setSelectedDay(null) }}
                    style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', color: '#555' }}>›</button>
                </div>
                <button onClick={() => { setShowCalendar(false); setSelectedDay(null) }}
                  style={{ background: 'none', border: 'none', fontSize: '20px', color: '#aaa', cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>

              <div style={{ padding: '20px 24px' }}>
                {/* Weekday headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 0' }}>{d}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {cells.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} />
                    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const films = filmsByDate[key] || []
                    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                    const isSelected = day === selectedDay
                    const hasFilms = films.length > 0

                    return (
                      <div key={day}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        style={{
                          borderRadius: '8px',
                          padding: '6px 4px',
                          cursor: hasFilms ? 'pointer' : 'default',
                          background: isSelected ? '#7C3AED' : hasFilms ? '#F3EEFF' : 'transparent',
                          border: isToday ? '2px solid #7C3AED' : '2px solid transparent',
                          minHeight: '72px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => { if (hasFilms && !isSelected) e.currentTarget.style.background = '#EDE9FE' }}
                        onMouseLeave={e => { if (hasFilms && !isSelected) e.currentTarget.style.background = '#F3EEFF'; if (!hasFilms) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: '700', color: isSelected ? '#fff' : isToday ? '#7C3AED' : '#333' }}>{day}</div>
                        {films.length > 0 && (
                          <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {films.slice(0, 3).map((film, fi) => (
                              film.poster_path
                                ? <img key={fi} src={`https://image.tmdb.org/t/p/w92${film.poster_path}`} alt={film.title}
                                    style={{ width: '20px', height: '30px', objectFit: 'cover', borderRadius: '3px', display: 'block' }} />
                                : <div key={fi} style={{ width: '20px', height: '30px', background: isSelected ? 'rgba(255,255,255,0.3)' : '#DDD6FE', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>🎬</div>
                            ))}
                            {films.length > 3 && <div style={{ fontSize: '9px', color: isSelected ? '#fff' : '#A78BFA', fontWeight: '700', alignSelf: 'flex-end' }}>+{films.length - 3}</div>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Selected day detail */}
                {selectedDay && selectedFilms.length > 0 && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid #f0f0f0', paddingTop: '20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#111', marginBottom: '12px' }}>
                      {new Date(year, month, selectedDay).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedFilms.map((film, i) => (
                        <div key={i} onClick={() => { setShowCalendar(false); router.push(`/film/${film.tmdb_id}`) }} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                          {film.poster_path
                            ? <img src={`https://image.tmdb.org/t/p/w92${film.poster_path}`} alt={film.title} style={{ width: '36px', height: '54px', objectFit: 'cover', borderRadius: '5px', flexShrink: 0 }} />
                            : <div style={{ width: '36px', height: '54px', background: '#F3EEFF', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🎬</div>
                          }
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>{film.title}</div>
                            {film.rating > 0 && (
                              <div style={{ fontSize: '12px', color: '#7C3AED', marginTop: '2px' }}>{'★'.repeat(film.rating)}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedDay && selectedFilms.length === 0 && (
                  <div style={{ marginTop: '16px', fontSize: '13px', color: '#aaa', textAlign: 'center' }}>No films logged on this day</div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
