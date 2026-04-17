'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const GENRES = [
  { id: 'action', label: 'Action', emoji: '💥' },
  { id: 'comedy', label: 'Comedy', emoji: '😂' },
  { id: 'drama', label: 'Drama', emoji: '🎭' },
  { id: 'horror', label: 'Horror', emoji: '👻' },
  { id: 'scifi', label: 'Sci-Fi', emoji: '🚀' },
  { id: 'romance', label: 'Romance', emoji: '💕' },
  { id: 'thriller', label: 'Thriller', emoji: '😰' },
  { id: 'crime', label: 'Crime', emoji: '🔍' },
  { id: 'documentary', label: 'Documentary', emoji: '📽️' },
  { id: 'animation', label: 'Animation', emoji: '✏️' },
  { id: 'fantasy', label: 'Fantasy', emoji: '🧙' },
  { id: 'history', label: 'History', emoji: '🏛️' },
]

const FILM_IDS = [278, 155, 27205, 680, 603, 496243, 157336, 313369, 419430, 238, 13, 545611]

const btnPrimary = {
  background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '14px 28px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
}
const btnSecondary = {
  background: 'none', color: '#888', border: '1px solid #e0e0e0', borderRadius: '8px',
  padding: '14px 20px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
}

function ProgressDots({ step }) {
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
      {[1, 2, 3, 4].map(s => (
        <div key={s} style={{
          width: s === step ? '24px' : '8px', height: '8px', borderRadius: '999px',
          backgroundColor: s <= step ? '#7C3AED' : '#e0e0e0', transition: 'all 0.2s',
        }} />
      ))}
    </div>
  )
}

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [user, setUser] = useState(null)
  const [selectedGenres, setSelectedGenres] = useState([])
  const [films, setFilms] = useState([])
  const [filmsLoading, setFilmsLoading] = useState(false)
  const [ratings, setRatings] = useState({})
  const [favorites, setFavorites] = useState([null, null, null, null])
  const [pickingSlot, setPickingSlot] = useState(null)
  const [favQuery, setFavQuery] = useState('')
  const [favResults, setFavResults] = useState([])
  const [favSearching, setFavSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const favTimer = useRef(null)
  const favInputRef = useRef(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      if (user.user_metadata?.onboarding_complete) { router.push('/feed'); return }
      setUser(user)
    })
  }, [])

  useEffect(() => {
    if (step === 3 && films.length === 0) {
      setFilmsLoading(true)
      Promise.all(FILM_IDS.map(id =>
        fetch(`/api/film/${id}`).then(r => r.json()).catch(() => null)
      )).then(results => {
        setFilms(results.filter(Boolean))
        setFilmsLoading(false)
      })
    }
  }, [step])

  function toggleGenre(id) {
    setSelectedGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  function setRating(tmdb_id, val) {
    setRatings(prev => ({ ...prev, [tmdb_id]: prev[tmdb_id] === val ? 0 : val }))
  }

  function handleFavSearch(val) {
    setFavQuery(val)
    clearTimeout(favTimer.current)
    if (!val.trim()) { setFavResults([]); return }
    setFavSearching(true)
    favTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`)
      const data = await res.json()
      setFavResults(data.results || [])
      setFavSearching(false)
    }, 400)
  }

  function openPicker(slot) {
    setPickingSlot(slot)
    setFavQuery('')
    setFavResults([])
    setTimeout(() => favInputRef.current?.focus(), 50)
  }

  function pickFavorite(film) {
    const slot = pickingSlot ?? favorites.findIndex(f => f === null)
    if (slot === -1) return
    const updated = [...favorites]
    updated[slot] = {
      tmdb_id: film.id, title: film.title,
      poster_path: film.poster ? film.poster.replace('https://image.tmdb.org/t/p/w185', '') : null,
    }
    setFavorites(updated)
    setPickingSlot(null)
    setFavQuery('')
    setFavResults([])
  }

  function removeFavorite(slot) {
    const updated = [...favorites]
    updated[slot] = null
    setFavorites(updated)
  }

  async function handleFinish() {
    if (!user) return
    setSaving(true)
    const ratedFilms = films.filter(f => (ratings[f.tmdb_id] || 0) > 0)
    if (ratedFilms.length > 0) {
      await supabase.from('film_logs').upsert(
        ratedFilms.map(f => ({
          user_id: user.id,
          tmdb_id: f.tmdb_id,
          title: f.title,
          poster_path: f.poster_path,
          rating: ratings[f.tmdb_id],
          logged_at: new Date().toISOString(),
        })),
        { onConflict: 'user_id,tmdb_id' }
      )
    }
    const validFavorites = favorites.filter(Boolean)
    await supabase.from('profiles').upsert(
      { id: user.id, favorite_films: validFavorites, email: user.email },
      { onConflict: 'id' }
    )
    await supabase.auth.updateUser({ data: { onboarding_complete: true } })
    router.push('/feed')
  }

  if (!user) return null

  const wrap = {
    minHeight: '100vh', background: '#fff',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 24px',
  }
  const card = { width: '100%', maxWidth: '640px' }

  // ── Step 1: Welcome ──────────────────────────────────────────────────────────
  if (step === 1) return (
    <div style={wrap}>
      <div style={{ ...card, textAlign: 'center' }}>
        <svg width="60" height="60" viewBox="0 0 80 80" style={{ marginBottom: '24px' }}>
          <rect x="4" y="4" width="52" height="42" rx="10" fill="#111" />
          <path d="M14 46 L10 62 L28 46Z" fill="#111" />
          <circle cx="18" cy="25" r="4" fill="#fff" />
          <circle cx="30" cy="25" r="4" fill="#fff" />
          <circle cx="42" cy="25" r="4" fill="#fff" />
          <circle cx="58" cy="56" r="18" fill="#7C3AED" />
          <path d="M52 47 L52 65 L70 56Z" fill="#fff" />
        </svg>
        <h1 style={{ fontSize: '38px', fontWeight: '800', color: '#111', letterSpacing: '-1px', margin: '0 0 16px' }}>
          Welcome to Reelmates
        </h1>
        <p style={{ fontSize: '17px', color: '#888', lineHeight: '1.7', margin: '0 auto 16px', maxWidth: '420px' }}>
          Let's build your taste profile so we can match you with Reelmates who love the same films.
        </p>
        <p style={{ fontSize: '14px', color: '#A78BFA', fontWeight: '600', margin: '0 0 40px' }}>Takes about 2 minutes.</p>
        <button onClick={() => setStep(2)} style={btnPrimary}>Get started →</button>
      </div>
    </div>
  )

  // ── Step 2: Genres ───────────────────────────────────────────────────────────
  if (step === 2) return (
    <div style={wrap}>
      <div style={card}>
        <ProgressDots step={step} />
        <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#111', letterSpacing: '-0.5px', margin: '0 0 8px', textAlign: 'center' }}>
          What genres do you love?
        </h2>
        <p style={{ fontSize: '15px', color: '#888', textAlign: 'center', margin: '0 0 32px' }}>Pick as many as you like</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '40px' }}>
          {GENRES.map(g => {
            const on = selectedGenres.includes(g.id)
            return (
              <button key={g.id} onClick={() => toggleGenre(g.id)} style={{
                background: on ? '#7C3AED' : '#F3EEFF',
                color: on ? '#fff' : '#7C3AED',
                border: `2px solid ${on ? '#7C3AED' : '#DDD6FE'}`,
                borderRadius: '999px', padding: '10px 20px', fontSize: '14px',
                fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {g.emoji} {g.label}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button onClick={() => setStep(1)} style={btnSecondary}>← Back</button>
          <button onClick={() => setStep(3)} style={btnPrimary}>Continue →</button>
        </div>
        <p style={{ textAlign: 'center', marginTop: '14px', fontSize: '13px', color: '#ccc' }}>You can skip this step</p>
      </div>
    </div>
  )

  // ── Step 3: Rate films ───────────────────────────────────────────────────────
  if (step === 3) return (
    <div style={{ ...wrap, alignItems: 'flex-start', paddingTop: '60px' }}>
      <div style={card}>
        <ProgressDots step={step} />
        <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#111', letterSpacing: '-0.5px', margin: '0 0 8px', textAlign: 'center' }}>
          Rate films you've seen
        </h2>
        <p style={{ fontSize: '15px', color: '#888', textAlign: 'center', margin: '0 0 32px' }}>
          Helps us find Reelmates who think like you. Skip any you haven't seen.
        </p>
        {filmsLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#A78BFA', fontSize: '15px' }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
            {films.map(film => {
              const r = ratings[film.tmdb_id] || 0
              return (
                <div key={film.tmdb_id} style={{ textAlign: 'center' }}>
                  {film.poster_path
                    ? <img src={`https://image.tmdb.org/t/p/w185${film.poster_path}`} alt={film.title}
                        style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px', display: 'block', marginBottom: '8px' }} />
                    : <div style={{ width: '100%', height: '180px', background: '#F3EEFF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '8px' }}>🎬</div>
                  }
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#111', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {film.title}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} onClick={() => setRating(film.tmdb_id, n)}
                        style={{ fontSize: '18px', cursor: 'pointer', color: n <= r ? '#7C3AED' : '#e0e0e0', userSelect: 'none' }}>★</span>
                    ))}
                  </div>
                  {r > 0 && (
                    <button onClick={() => setRating(film.tmdb_id, 0)}
                      style={{ background: 'none', border: 'none', fontSize: '10px', color: '#ccc', cursor: 'pointer', marginTop: '2px', fontFamily: 'inherit' }}>
                      clear
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button onClick={() => setStep(2)} style={btnSecondary}>← Back</button>
          <button onClick={() => setStep(4)} style={btnPrimary}>Continue →</button>
        </div>
      </div>
    </div>
  )

  // ── Step 4: Favorites ────────────────────────────────────────────────────────
  if (step === 4) return (
    <div style={{ ...wrap, alignItems: 'flex-start', paddingTop: '60px' }}>
      <div style={card}>
        <ProgressDots step={step} />
        <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#111', letterSpacing: '-0.5px', margin: '0 0 8px', textAlign: 'center' }}>
          Pick your all-time favorites
        </h2>
        <p style={{ fontSize: '15px', color: '#888', textAlign: 'center', margin: '0 0 32px' }}>
          Up to 4 films that define your taste
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          {favorites.map((film, i) => (
            <div key={i}>
              {film ? (
                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => openPicker(i)}>
                  {film.poster_path
                    ? <img src={`https://image.tmdb.org/t/p/w185${film.poster_path}`} alt={film.title}
                        style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                    : <div style={{ width: '100%', aspectRatio: '2/3', background: '#F3EEFF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎬</div>
                  }
                  <button onClick={e => { e.stopPropagation(); removeFavorite(i) }}
                    style={{ position: 'absolute', top: '7px', right: '7px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '11px' }}>✕</button>
                  <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: '600', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{film.title}</div>
                </div>
              ) : (
                <button onClick={() => openPicker(i)}
                  style={{ width: '100%', aspectRatio: '2/3', background: pickingSlot === i ? '#EDE9FE' : '#F3EEFF', border: `2px dashed ${pickingSlot === i ? '#7C3AED' : '#DDD6FE'}`, borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.background = '#EDE9FE' }}
                  onMouseLeave={e => { if (pickingSlot !== i) { e.currentTarget.style.borderColor = '#DDD6FE'; e.currentTarget.style.background = '#F3EEFF' } }}>
                  <div style={{ fontSize: '22px', color: '#A78BFA' }}>+</div>
                  <div style={{ fontSize: '10px', color: '#A78BFA', fontWeight: '600', textAlign: 'center' }}>Pick a film</div>
                </button>
              )}
            </div>
          ))}
        </div>

        {pickingSlot !== null && (
          <div style={{ background: '#F3EEFF', border: '1px solid #DDD6FE', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#7C3AED' }}>Pick a film for slot {pickingSlot + 1}</div>
              <button onClick={() => { setPickingSlot(null); setFavQuery(''); setFavResults([]) }}
                style={{ background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            <input ref={favInputRef} type="text" value={favQuery} onChange={e => handleFavSearch(e.target.value)}
              placeholder="Search any film…"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDD6FE', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: '#111', background: '#fff' }}
              onFocus={e => e.target.style.borderColor = '#7C3AED'}
              onBlur={e => e.target.style.borderColor = '#DDD6FE'}
            />
            {favSearching && <div style={{ fontSize: '12px', color: '#A78BFA', marginTop: '8px' }}>Searching…</div>}
            {favResults.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '12px' }}>
                {favResults.map(film => (
                  <div key={film.id} onClick={() => pickFavorite(film)} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    {film.poster
                      ? <img src={film.poster} alt={film.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
                      : <div style={{ width: '100%', aspectRatio: '2/3', background: '#DDD6FE', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎬</div>
                    }
                    <div style={{ fontSize: '10px', color: '#6D28D9', fontWeight: '600', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{film.title}</div>
                  </div>
                ))}
              </div>
            )}
            {!favSearching && favQuery && favResults.length === 0 && (
              <div style={{ fontSize: '13px', color: '#A78BFA', textAlign: 'center', padding: '12px 0' }}>No results for "{favQuery}"</div>
            )}
            {!favQuery && (
              <div style={{ fontSize: '13px', color: '#A78BFA', textAlign: 'center', padding: '8px 0' }}>Start typing to search any film</div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button onClick={() => setStep(3)} style={btnSecondary}>← Back</button>
          <button onClick={handleFinish} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Finish & go to feed →'}
          </button>
        </div>
        <p style={{ textAlign: 'center', marginTop: '14px', fontSize: '13px', color: '#ccc' }}>You can update your favorites anytime from your profile</p>
      </div>
    </div>
  )
}
