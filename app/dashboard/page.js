'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const values = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else { current += char }
    }
    values.push(current.trim())
    const row = {}
    headers.forEach((h, i) => { row[h] = (values[i] || '').replace(/^"|"$/g, '') })
    return row
  }).filter(row => row.Name)
}

function convertRating(lbRating) {
  if (!lbRating || lbRating === '') return 0
  const n = parseFloat(lbRating)
  if (isNaN(n)) return 0
  return Math.min(5, Math.max(1, Math.round(n)))
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ logs: 0, watchlist: 0, connections: 0 })
  const [watchlistItems, setWatchlistItems] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [showImport, setShowImport] = useState(false)
  const [importStage, setImportStage] = useState('idle') // idle | preview | importing | done
  const [importFilms, setImportFilms] = useState([])
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importResults, setImportResults] = useState({ imported: 0, skipped: 0 })
  const fileInputRef = useRef(null)
  const supabase = createClient()
  const router = useRouter()

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
        { data: wlItems },
        { data: logs }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('film_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('connections').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('watchlist').select('id, title, poster_path').eq('user_id', user.id).order('added_at', { ascending: false }).limit(12),
        supabase.from('film_logs').select('tmdb_id, title, poster_path, rating').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(12)
      ])

      setProfile(profile)
      setStats({ logs: logCount || 0, watchlist: wlCount || 0, connections: connCount || 0 })
      setWatchlistItems(wlItems || [])
      setRecentLogs(logs || [])
    }
    init()
  }, [])

  function handleCSVFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result)
      const films = rows.map(row => ({
        title: row.Name,
        year: row.Year || '',
        rating: convertRating(row.Rating)
      }))
      setImportFilms(films)
      setImportStage('preview')
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    setImportStage('importing')
    const total = importFilms.length
    setImportProgress({ current: 0, total })
    let imported = 0
    let skipped = 0

    for (let i = 0; i < importFilms.length; i++) {
      const film = importFilms[i]
      setImportProgress({ current: i + 1, total })

      try {
        const query = film.year ? `${film.title} ${film.year}` : film.title
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        const match = data.results?.[0]

        if (!match) { skipped++; continue }

        const { error } = await supabase.from('film_logs').upsert({
          user_id: user.id,
          tmdb_id: match.id,
          title: match.title,
          poster_path: match.poster
            ? match.poster.replace('https://image.tmdb.org/t/p/w185', '')
            : null,
          rating: film.rating || 0,
          review: null
        }, { onConflict: 'user_id,tmdb_id' })

        if (error) { skipped++ } else { imported++ }
      } catch {
        skipped++
      }

      // Small delay to avoid hammering TMDB
      await new Promise(r => setTimeout(r, 80))
    }

    setImportResults({ imported, skipped })
    setImportStage('done')
    // Refresh stats and recent logs
    const [{ count: logCount }, { data: logs }] = await Promise.all([
      supabase.from('film_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('film_logs').select('tmdb_id, title, poster_path, rating').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(12)
    ])
    setStats(prev => ({ ...prev, logs: logCount || 0 }))
    setRecentLogs(logs || [])
  }

  function closeImport() {
    setShowImport(false)
    setImportStage('idle')
    setImportFilms([])
    setImportProgress({ current: 0, total: 0 })
    setImportResults({ imported: 0, skipped: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const progressPct = importProgress.total
    ? Math.round((importProgress.current / importProgress.total) * 100)
    : 0

  if (!user) return null

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
          <button onClick={() => router.push('/profile')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Edit Profile</button>
        </div>
      </div>

      {/* Letterboxd import modal */}
      {showImport && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={e => { if (e.target === e.currentTarget && importStage !== 'importing') closeImport() }}
        >
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#111' }}>Import from Letterboxd</div>
              {importStage !== 'importing' && (
                <button onClick={closeImport} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#aaa', cursor: 'pointer', lineHeight: 1 }}>✕</button>
              )}
            </div>

            <div style={{ padding: '24px' }}>

              {/* Step 1 — idle */}
              {importStage === 'idle' && (
                <>
                  <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '20px' }}>
                    Export your film data from Letterboxd, then upload the CSV here to import your logs into Reelmates.
                  </div>
                  <div style={{ background: '#F3EEFF', border: '1px solid #DDD6FE', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#6D28D9', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>How to export from Letterboxd</div>
                    <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#6D28D9', lineHeight: '1.8' }}>
                      <li>Go to <strong>letterboxd.com/user/export</strong></li>
                      <li>Click <strong>Export your data</strong></li>
                      <li>Download the ZIP and unzip it</li>
                      <li>Upload <strong>diary.csv</strong> or <strong>ratings.csv</strong> below</li>
                    </ol>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVFile} style={{ display: 'none' }} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ width: '100%', background: '#7C3AED', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '14px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Choose CSV file
                  </button>
                </>
              )}

              {/* Step 2 — preview */}
              {importStage === 'preview' && (
                <>
                  <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
                    <div style={{ fontSize: '48px', fontWeight: '800', color: '#7C3AED', marginBottom: '8px' }}>{importFilms.length}</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#111', marginBottom: '6px' }}>films found in your CSV</div>
                    <div style={{ fontSize: '13px', color: '#aaa' }}>
                      {importFilms.filter(f => f.rating > 0).length} with ratings · {importFilms.filter(f => !f.rating).length} unrated
                    </div>
                  </div>
                  <div style={{ background: '#FFF4ED', border: '1px solid #FED7AA', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: '#92400E' }}>
                    Large imports can take a few minutes. Keep this window open until it's done.
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setImportStage('idle')} style={{ flex: 1, background: 'none', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: '600', color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Back
                    </button>
                    <button onClick={handleImport} style={{ flex: 2, background: '#7C3AED', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Import all films →
                    </button>
                  </div>
                </>
              )}

              {/* Step 3 — importing */}
              {importStage === 'importing' && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#111', marginBottom: '6px' }}>
                    Importing your films…
                  </div>
                  <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '20px' }}>
                    {importProgress.current} of {importProgress.total}
                  </div>
                  <div style={{ background: '#F3EEFF', borderRadius: '999px', height: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ background: '#7C3AED', height: '100%', width: `${progressPct}%`, borderRadius: '999px', transition: 'width 0.2s ease' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#A78BFA' }}>{progressPct}% complete</div>
                </div>
              )}

              {/* Step 4 — done */}
              {importStage === 'done' && (
                <>
                  <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎬</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', marginBottom: '8px' }}>Import complete!</div>
                    <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.7' }}>
                      <span style={{ color: '#7C3AED', fontWeight: '700' }}>{importResults.imported} films</span> imported successfully
                      {importResults.skipped > 0 && (
                        <> · <span style={{ color: '#aaa' }}>{importResults.skipped} couldn't be matched</span></>
                      )}
                    </div>
                  </div>
                  <button onClick={closeImport} style={{ width: '100%', background: '#7C3AED', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '14px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Done
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Greeting */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#111', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
              Hey{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
            </h1>
            <p style={{ fontSize: '15px', color: '#888', margin: 0 }}>@{profile?.username || user.email}</p>
          </div>
          <button
            onClick={() => setShowImport(true)}
            style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: '600', color: '#888', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
          >
            <span style={{ fontSize: '15px' }}>🎞</span> Import from Letterboxd
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '48px' }}>
          <div style={{ background: '#F3EEFF', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#7C3AED', marginBottom: '4px' }}>{stats.logs}</div>
            <div style={{ fontSize: '13px', color: '#6D28D9', fontWeight: '600' }}>Films logged</div>
          </div>
          <div style={{ background: '#F3EEFF', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#7C3AED', marginBottom: '4px' }}>{stats.watchlist}</div>
            <div style={{ fontSize: '13px', color: '#6D28D9', fontWeight: '600' }}>On watchlist</div>
          </div>
          <div style={{ background: '#F3EEFF', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#7C3AED', marginBottom: '4px' }}>{stats.connections}</div>
            <div style={{ fontSize: '13px', color: '#6D28D9', fontWeight: '600' }}>Reelmates</div>
          </div>
        </div>

        {/* Watchlist */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>My Watchlist</div>
              <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>Films you want to see</div>
            </div>
            <button onClick={() => router.push('/watchlist')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}>
              View all →
            </button>
          </div>
          {watchlistItems.length === 0 ? (
            <div style={{ border: '1px dashed #e0e0e0', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#ccc', marginBottom: '12px' }}>Your watchlist is empty</div>
              <button onClick={() => router.push('/films')} style={{ background: '#7C3AED', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                Find films to watch →
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
              {watchlistItems.map(item => (
                <div key={item.id} onClick={() => router.push('/watchlist')} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {item.poster_path
                    ? <img src={`https://image.tmdb.org/t/p/w185${item.poster_path}`} alt={item.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                    : <div style={{ width: '100%', aspectRatio: '2/3', background: '#F3EEFF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎬</div>
                  }
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent logs */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>Recently Logged</div>
              <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>Your latest film ratings</div>
            </div>
            <button onClick={() => router.push('/films')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}>
              Log a film →
            </button>
          </div>
          {recentLogs.length === 0 ? (
            <div style={{ border: '1px dashed #e0e0e0', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#ccc', marginBottom: '12px' }}>You haven't logged any films yet</div>
              <button onClick={() => router.push('/films')} style={{ background: '#7C3AED', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                Log your first film →
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
              {recentLogs.map(film => (
                <div key={film.tmdb_id} onClick={() => router.push('/films')} style={{ cursor: 'pointer', position: 'relative' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {film.poster_path
                    ? <img src={`https://image.tmdb.org/t/p/w185${film.poster_path}`} alt={film.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                    : <div style={{ width: '100%', aspectRatio: '2/3', background: '#F3EEFF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎬</div>
                  }
                  {film.rating > 0 && (
                    <div style={{ position: 'absolute', bottom: '6px', left: '6px', right: '6px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: '#fff', fontWeight: '700', letterSpacing: '1px' }}>
                        {'★'.repeat(film.rating)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
