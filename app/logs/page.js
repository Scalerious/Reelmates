'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import MiniProfile from '../components/MiniProfile'
import NavNotifButton from '../components/NavNotifButton'

function StarDisplay({ rating, size = 13, color = '#7C3AED' }) {
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

function groupByMonth(logs) {
  const groups = []
  const map = new Map()
  for (const log of logs) {
    const d = new Date(log.logged_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!map.has(key)) {
      map.set(key, { label, logs: [] })
      groups.push(map.get(key))
    }
    map.get(key).logs.push(log)
  }
  return groups
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('film_logs')
        .select('id, tmdb_id, title, poster_path, rating, review, logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
      setLogs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const groups = groupByMonth(logs)

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

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

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '40px' }}>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#111', letterSpacing: '-0.5px' }}>Logged Films</div>
          {!loading && <div style={{ fontSize: '14px', color: '#A78BFA', fontWeight: '700' }}>{logs.length} films</div>}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '80px 0' }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎬</div>
            <div style={{ fontSize: '16px', color: '#ccc' }}>No films logged yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {groups.map(group => (
              <div key={group.label}>

                {/* Month heading */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {group.label}
                  </div>
                  <div style={{ flex: 1, height: '1px', background: '#f0f0f0' }} />
                  <div style={{ fontSize: '12px', color: '#ccc', fontWeight: '600' }}>{group.logs.length} film{group.logs.length !== 1 ? 's' : ''}</div>
                </div>

                {/* Films in this month */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {group.logs.map((log, i) => (
                    <div
                      key={log.id}
                      onClick={() => router.push(`/film/${log.tmdb_id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '16px',
                        padding: '12px 0',
                        borderBottom: i < group.logs.length - 1 ? '1px solid #f5f5f5' : 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Poster */}
                      {log.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${log.poster_path}`}
                          alt={log.title}
                          style={{ width: '44px', height: '66px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{ width: '44px', height: '66px', background: '#F3EEFF', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎬</div>
                      )}

                      {/* Date */}
                      <div style={{ flexShrink: 0, width: '52px', textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', lineHeight: 1 }}>
                          {new Date(log.logged_at).getDate()}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                          {new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                      </div>

                      {/* Divider */}
                      <div style={{ width: '1px', height: '48px', background: '#f0f0f0', flexShrink: 0 }} />

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#111', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.title}
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          <StarDisplay rating={log.rating} size={13} />
                        </div>
                        {log.review && (
                          <div style={{ fontSize: '13px', color: '#888', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            "{log.review}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
