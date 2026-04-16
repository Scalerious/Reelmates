'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Supabase puts the session in the URL hash on redirect — pick it up
  useEffect(() => {
    supabase.auth.getSession()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords don't match."); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => router.push('/feed'), 2500)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#ffffff',
      fontFamily: "'DM Sans', system-ui, sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <svg width="48" height="48" viewBox="0 0 80 80" style={{ marginBottom: '16px' }}>
            <rect x="4" y="4" width="52" height="42" rx="10" fill="#111111"/>
            <path d="M14 46 L10 62 L28 46Z" fill="#111111"/>
            <circle cx="18" cy="25" r="4" fill="#ffffff"/>
            <circle cx="30" cy="25" r="4" fill="#ffffff"/>
            <circle cx="42" cy="25" r="4" fill="#ffffff"/>
            <circle cx="58" cy="56" r="18" fill="#7C3AED"/>
            <path d="M52 47 L52 65 L70 56Z" fill="#ffffff"/>
          </svg>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#111', marginBottom: '6px' }}>Set new password</div>
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>Choose a new password for your account.</p>
        </div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', marginBottom: '8px' }}>Password updated!</div>
            <div style={{ fontSize: '14px', color: '#888' }}>Taking you to your feed…</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#111', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>New password</label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)} required
                placeholder="At least 6 characters"
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#7C3AED'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#111', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Confirm password</label>
              <input
                type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)} required
                placeholder="Repeat your new password"
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#7C3AED'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            {error && (
              <div style={{ background: '#FFF4ED', border: '1px solid #FED7AA', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#C2410C' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              background: loading ? '#A78BFA' : '#7C3AED', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: '4px'
            }}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
