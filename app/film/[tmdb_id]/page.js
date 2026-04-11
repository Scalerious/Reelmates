'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import MiniProfile from '../../components/MiniProfile'

export default function FilmDetail() {
  const [user, setUser] = useState(null)
  const [film, setFilm] = useState(null)
  const [myLog, setMyLog] = useState(null)
  const [reelmates, setReelmates] = useState([])
  const [loading, setLoading] = useState(true)
  const [logRating, setLogRating] = useState(0)
  const [logReview, setLogReview] = useState('')
  const [logHover, setLogHover] = useState(0)
  const [saving, setSaving] = useState(false)
  const [logSaved, setLogSaved] = useState(false)
  const router = useRouter()
  const { tmdb_id } = useParams()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const [filmRes, myLogRes, connectionsRes] = await Promise.all([
        fetch(`/api/film/${tmdb_id}`),
        supabase.from('film_logs').select('rating, review, logged_at').eq('user_id', user.id).eq('tmdb_id', tmdb_id).single(),
        supabase.from('connections').select('following_id').eq('follower_id', user.id)
      ])

      const filmData = await filmRes.json()
      setFilm(filmData)
      setMyLog(myLogRes.data || null)

      const followingIds = (connectionsRes.data || []).map(c => c.following_id)
      if (followingIds.length > 0) {
        const { data: mateReviews } = await supabase
          .from('film_logs')
          .select('rating, review, user_id, profiles(username, avatar_url, full_name)')
          .eq('tmdb_id', tmdb_id)
          .in('user_id', followingIds)
          .not('review', 'is', null)
          .neq('review', '')

        setReelmates(mateReviews || [])
      }

      setLoading(false)
    }
    init()
  }, [tmdb_id])

  async function handleLog() {
    if (!logRating || saving) return
    setSaving(true)
    const { error } = await supabase.from('film_logs').upsert({
      user_id: user.id,
      tmdb_id: parseInt(tmdb_id),
      title: film.title,
      poster_path: film.poster_path || null,
      rating: logRating,
      review: logReview.trim() || null
    }, { onConflict: 'user_id,tmdb_id' })
    if (!error) {
      setMyLog({ rating: logRating, review: logReview.trim() || null, logged_at: new Date().toISOString() })
      setLogSaved(true)
    }
    setSaving(false)
  }

  if (loading || !film) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ fontSize: '14px', color: '#aaa' }}>Loading…</div>
      </div>
    )
  }

  const posterUrl = film.poster_path ? `https://image.tmdb.org/t/p/w342${film.poster_path}` : null
  const backdropUrl = film.backdrop_path ? `https://image.tmdb.org/t/p/w1280${film.backdrop_path}` : null

  function firstSentence(text) {
    if (!text) return ''
    const match = text.match(/^[^.!?]*[.!?]/)
    return match ? match[0] : text.slice(0, 120) + (text.length > 120 ? '…' : '')
  }

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
          <button onClick={() => router.push('/feed')} style={{ background: '#7C3AED', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', color: '#fff' }}>Say Something</button>
          <button onClick={() => router.push('/films')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Log a Film</button>
          <button onClick={() => router.push('/users')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Find Reelmates</button>
          <MiniProfile />
        </div>
      </div>

      {/* Backdrop */}
      {backdropUrl && (
        <div style={{ position: 'relative', height: '260px', overflow: 'hidden' }}>
          <img src={backdropUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(255,255,255,1))' }} />
        </div>
      )}

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: backdropUrl ? '0 24px 60px' : '48px 24px 60px' }}>

        {/* Film header: poster + info */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', marginBottom: '48px', marginTop: backdropUrl ? '-80px' : '0', position: 'relative', zIndex: 1 }}>

          {/* Poster */}
          {posterUrl ? (
            <img src={posterUrl} alt={film.title}
              style={{ width: '180px', flexShrink: 0, borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', display: 'block' }} />
          ) : (
            <div style={{ width: '180px', flexShrink: 0, aspectRatio: '2/3', background: '#F3EEFF', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🎬</div>
          )}

          {/* Info */}
          <div style={{ flex: 1, paddingTop: backdropUrl ? '40px' : '0' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {film.genres.map(g => (
                <span key={g} style={{ background: '#F3EEFF', color: '#7C3AED', fontSize: '11px', fontWeight: '700', borderRadius: '20px', padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{g}</span>
              ))}
            </div>

            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#111', margin: '0 0 4px', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{film.title}</h1>
            <div style={{ fontSize: '15px', color: '#aaa', marginBottom: '20px' }}>
              {film.year}{film.runtime ? ` · ${film.runtime} min` : ''}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {film.directors.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '90px', paddingTop: '1px' }}>Director</span>
                  <span style={{ fontSize: '14px', color: '#333', fontWeight: '600' }}>{film.directors.join(', ')}</span>
                </div>
              )}
              {film.writers.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '90px', paddingTop: '1px' }}>Screenplay</span>
                  <span style={{ fontSize: '14px', color: '#333', fontWeight: '600' }}>{[...new Set(film.writers)].join(', ')}</span>
                </div>
              )}
            </div>

            {/* Top cast */}
            {film.cast.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Cast</div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {film.cast.map((actor, i) => (
                    <div key={i} style={{ textAlign: 'center', width: '64px' }}>
                      {actor.profile_path ? (
                        <img src={actor.profile_path} alt={actor.name}
                          style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '0 auto 6px' }} />
                      ) : (
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F3EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto 6px' }}>👤</div>
                      )}
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor.name}</div>
                      <div style={{ fontSize: '9px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor.character}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Overview */}
        {film.overview && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Synopsis</div>
            <p style={{ fontSize: '15px', color: '#444', lineHeight: '1.75', margin: 0 }}>{film.overview}</p>
          </div>
        )}

        {/* My review */}
        <div style={{ marginBottom: '48px', borderTop: '1px solid #f0f0f0', paddingTop: '36px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>My Review</div>
          {myLog ? (
            <div style={{ background: '#F3EEFF', borderRadius: '12px', padding: '20px 24px' }}>
              {myLog.rating > 0 && (
                <div style={{ fontSize: '20px', color: '#7C3AED', marginBottom: '10px', letterSpacing: '2px' }}>{'★'.repeat(myLog.rating)}{'☆'.repeat(5 - myLog.rating)}</div>
              )}
              {myLog.review ? (
                <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', margin: 0, fontStyle: 'italic' }}>"{myLog.review}"</p>
              ) : (
                <p style={{ fontSize: '14px', color: '#A78BFA', margin: 0 }}>You logged this film but didn't leave a review.</p>
              )}
              {myLog.logged_at && (
                <div style={{ fontSize: '12px', color: '#A78BFA', marginTop: '12px' }}>
                  Logged {new Date(myLog.logged_at).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ border: '1px solid #f0f0f0', borderRadius: '12px', padding: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '16px' }}>Rate this film</div>
              {/* Star picker */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n}
                    onMouseEnter={() => setLogHover(n)}
                    onMouseLeave={() => setLogHover(0)}
                    onClick={() => setLogRating(n)}
                    style={{ fontSize: '28px', cursor: 'pointer', color: n <= (logHover || logRating) ? '#7C3AED' : '#e0e0e0', transition: 'color 0.1s' }}>★</span>
                ))}
              </div>
              <textarea
                value={logReview}
                onChange={e => setLogReview(e.target.value)}
                placeholder="Write a review… (optional)"
                rows={3}
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', lineHeight: '1.5', color: '#333', marginBottom: '12px' }}
                onFocus={e => e.target.style.borderColor = '#7C3AED'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
              />
              <button onClick={handleLog} disabled={!logRating || saving}
                style={{ background: logRating ? '#7C3AED' : '#e0e0e0', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', color: logRating ? '#fff' : '#aaa', cursor: logRating ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'background 0.15s' }}>
                {saving ? 'Saving…' : logSaved ? 'Logged ✓' : 'Log this film'}
              </button>
            </div>
          )}
        </div>

        {/* Reelmates reviews */}
        {reelmates.length > 0 && (
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '36px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>What your Reelmates think</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reelmates.map((entry, i) => {
                const p = entry.profiles
                const initials = (p?.full_name || p?.username || '?').charAt(0).toUpperCase()
                return (
                  <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    {/* Avatar */}
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt={p.username}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #F3EEFF' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F3EEFF', border: '2px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '800', color: '#7C3AED', flexShrink: 0 }}>
                        {initials}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#111' }}>{p?.full_name || p?.username || 'Reelmate'}</span>
                        {entry.rating > 0 && (
                          <span style={{ fontSize: '13px', color: '#7C3AED', letterSpacing: '1px' }}>{'★'.repeat(entry.rating)}</span>
                        )}
                      </div>
                      {entry.review && (
                        <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', margin: 0 }}>"{firstSentence(entry.review)}"</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
