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
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getProfile() {
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
      }
    }
    getProfile()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const { error } = await supabase
      .from('profiles')
      .update({ username, full_name: fullName, bio, location })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
    } else {
      setMessage('Profile saved!')
    }
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
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
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>
            Dashboard
          </button>
          <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Profile form */}
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 24px' }}>

        <div style={{ marginBottom: '36px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Your profile</h1>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>This is how other Reelmates will see you.</p>
        </div>

        {/* Avatar placeholder */}
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#F3EEFF', border: '2px solid #7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', color: '#7C3AED' }}>
            {fullName ? fullName.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>{fullName || 'Your name'}</div>
            <div style={{ fontSize: '13px', color: '#888' }}>@{username || 'username'}</div>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

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

          <button type="submit" disabled={loading} style={{
            background: loading ? '#A78BFA' : '#7C3AED', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
          }}>
            {loading ? 'Saving...' : 'Save Profile'}
          </button>

        </form>
      </div>
    </div>
  )
}