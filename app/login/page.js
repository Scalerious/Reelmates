'use client'

import { useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/feed')
  }

  async function handleReset(e) {
    e.preventDefault()
    setResetLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    setResetSent(true)
    setResetLoading(false)
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <svg width="160" height="36" viewBox="0 0 160 36">
              <text x="0" y="28" fontFamily="'DM Sans',system-ui" fontWeight="800"
                fontSize="32" fill="#7C3AED" letterSpacing="-1">Reel</text>
              <text x="74" y="28" fontFamily="'DM Sans',system-ui" fontWeight="400"
                fontSize="32" fill="#7C3AED" opacity="0.4" letterSpacing="-1">mates</text>
            </svg>
          </div>
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>Welcome back.</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600',
              color: '#111', marginBottom: '6px', letterSpacing: '0.04em',
              textTransform: 'uppercase' }}>Email</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)} required
              placeholder="you@example.com"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0',
                borderRadius: '8px', fontSize: '14px', outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#7C3AED'}
              onBlur={e => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600',
                color: '#111', letterSpacing: '0.04em',
                textTransform: 'uppercase' }}>Password</label>
              <button type="button" onClick={() => { setShowReset(true); setResetEmail(email) }}
                style={{ background: 'none', border: 'none', fontSize: '12px', color: '#7C3AED', fontWeight: '600', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                Forgot password?
              </button>
            </div>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)} required
              placeholder="Your password"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0',
                borderRadius: '8px', fontSize: '14px', outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#7C3AED'}
              onBlur={e => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          {error && (
            <div style={{ background: '#FFF4ED', border: '1px solid #FED7AA',
              borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#C2410C' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            background: loading ? '#A78BFA' : '#7C3AED', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: '4px'
          }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#888' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: '#7C3AED', fontWeight: '600',
            textDecoration: 'none' }}>Sign up</Link>
        </p>

      </div>

      {/* Forgot password modal */}
      {showReset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowReset(false); setResetSent(false) } }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '380px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            {resetSent ? (
              <>
                <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>📬</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', textAlign: 'center', marginBottom: '8px' }}>Check your email</div>
                <div style={{ fontSize: '14px', color: '#888', textAlign: 'center', lineHeight: '1.6', marginBottom: '24px' }}>
                  We sent a password reset link to <strong>{resetEmail}</strong>
                </div>
                <button onClick={() => { setShowReset(false); setResetSent(false) }}
                  style={{ width: '100%', background: '#7C3AED', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '14px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Done
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#111', marginBottom: '6px' }}>Reset password</div>
                <div style={{ fontSize: '14px', color: '#888', marginBottom: '24px', lineHeight: '1.5' }}>Enter your email and we'll send you a reset link.</div>
                <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="email" value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)} required
                    placeholder="you@example.com"
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#7C3AED'}
                    onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                  />
                  <button type="submit" disabled={resetLoading}
                    style={{ background: resetLoading ? '#A78BFA' : '#7C3AED', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '14px', fontWeight: '700', color: '#fff', cursor: resetLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {resetLoading ? 'Sending…' : 'Send reset link'}
                  </button>
                  <button type="button" onClick={() => setShowReset(false)}
                    style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}