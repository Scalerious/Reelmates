'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import MiniProfile from '../components/MiniProfile'
import NavNotifButton from '../components/NavNotifButton'

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

  function timeAgo(dateString) {
    const days = Math.floor((new Date() - new Date(dateString)) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

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

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '32px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '20px' }}>
            {logs.map(log => (
              <div key={log.id} onClick={() => router.push(`/film/${log.tmdb_id}`)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                {log.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${log.poster_path}`}
                    alt={log.title}
                    style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '8px', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '2/3', background: '#F3EEFF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🎬</div>
                )}
                <div style={{ marginTop: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#7C3AED', letterSpacing: '1px' }}>
                    {'★'.repeat(log.rating)}{'☆'.repeat(5 - log.rating)}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#111', marginTop: '2px', lineHeight: 1.3 }} title={log.title}>
                    {log.title.length > 20 ? log.title.slice(0, 18) + '…' : log.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{timeAgo(log.logged_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
