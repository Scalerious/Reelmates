'use client'

import { useEffect, useState } from 'react'
import { createClient } from './lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) router.push('/dashboard')
    }
    checkUser()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Navbar */}
      <div style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="36" height="36" viewBox="0 0 80 80">
            <rect x="4" y="4" width="52" height="42" rx="10" fill="#111111"/>
            <path d="M14 46 L10 62 L28 46Z" fill="#111111"/>
            <circle cx="18" cy="25" r="4" fill="#ffffff"/>
            <circle cx="30" cy="25" r="4" fill="#ffffff"/>
            <circle cx="42" cy="25" r="4" fill="#ffffff"/>
            <circle cx="58" cy="56" r="18" fill="#7C3AED"/>
            <path d="M52 47 L52 65 L70 56Z" fill="#ffffff"/>
          </svg>
          <svg width="140" height="32" viewBox="0 0 140 32">
            <text x="0" y="25" fontFamily="'DM Sans',system-ui" fontWeight="800" fontSize="28" fill="#7C3AED" letterSpacing="-0.5">Reel</text>
            <text x="66" y="25" fontFamily="'DM Sans',system-ui" fontWeight="400" fontSize="28" fill="#7C3AED" opacity="0.4" letterSpacing="-0.5">mates</text>
          </svg>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/login')}
            style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', color: '#888', fontWeight: '500' }}
          >
            Sign in
          </button>
          <button
            onClick={() => router.push('/signup')}
            style={{ background: '#7C3AED', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', color: '#fff', fontWeight: '700' }}
          >
            Get started free
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '100px 40px 80px', textAlign: 'center' }}>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F3EEFF', border: '1px solid #DDD6FE', borderRadius: '999px', padding: '6px 16px', marginBottom: '32px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#7C3AED', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Now in beta</span>
        </div>

        <h1 style={{ fontSize: '64px', fontWeight: '800', color: '#111', lineHeight: '1.05', letterSpacing: '-2px', margin: '0 0 24px' }}>
          Find your people.<br/>
          <span style={{ color: '#7C3AED' }}>Watch together.</span>
        </h1>

        <p style={{ fontSize: '20px', color: '#888', lineHeight: '1.6', margin: '0 0 48px', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
          Log the films you love. Connect with people who have the same taste. Then watch something together — tonight.
        </p>

        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/signup')}
            style={{ background: '#7C3AED', border: 'none', borderRadius: '10px', padding: '16px 32px', fontSize: '16px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = '#6D28D9'}
            onMouseLeave={e => e.currentTarget.style.background = '#7C3AED'}
          >
            Create your account →
          </button>
          <button
            onClick={() => router.push('/login')}
            style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '16px 32px', fontSize: '16px', fontWeight: '600', color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Sign in
          </button>
        </div>

      </div>

      {/* Features */}
      <div style={{ background: '#FAFAFA', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', padding: '80px 40px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#A78BFA', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '48px' }}>
            Everything you need to watch with friends
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>

            <div style={{ textAlign: 'center', padding: '32px 24px', background: '#fff', borderRadius: '16px', border: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎬</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', marginBottom: '8px', letterSpacing: '-0.3px' }}>Log your films</div>
              <div style={{ fontSize: '14px', color: '#888', lineHeight: '1.6' }}>Rate anything you've watched. Build a log that shows your taste at a glance.</div>
            </div>

            <div style={{ textAlign: 'center', padding: '32px 24px', background: '#F3EEFF', borderRadius: '16px', border: '1px solid #DDD6FE' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>👥</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#7C3AED', marginBottom: '8px', letterSpacing: '-0.3px' }}>Meet your people</div>
              <div style={{ fontSize: '14px', color: '#6D28D9', lineHeight: '1.6' }}>Connect with people who love the same films. Find your Reelmates.</div>
            </div>

            <div style={{ textAlign: 'center', padding: '32px 24px', background: '#fff', borderRadius: '16px', border: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>📽️</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', marginBottom: '8px', letterSpacing: '-0.3px' }}>Watch together</div>
              <div style={{ fontSize: '14px', color: '#888', lineHeight: '1.6' }}>See what your Reelmates are watching. Never miss what the people you trust are loving.</div>
            </div>

          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '100px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width="56" height="56" viewBox="0 0 80 80">
              <rect x="4" y="4" width="52" height="42" rx="10" fill="#111111"/>
              <path d="M14 46 L10 62 L28 46Z" fill="#111111"/>
              <circle cx="18" cy="25" r="4" fill="#ffffff"/>
              <circle cx="30" cy="25" r="4" fill="#ffffff"/>
              <circle cx="42" cy="25" r="4" fill="#ffffff"/>
              <circle cx="58" cy="56" r="18" fill="#7C3AED"/>
              <path d="M52 47 L52 65 L70 56Z" fill="#ffffff"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '40px', fontWeight: '800', color: '#111', letterSpacing: '-1px', marginBottom: '16px' }}>
            Ready to find your Reelmates?
          </h2>
          <p style={{ fontSize: '16px', color: '#888', marginBottom: '36px', lineHeight: '1.6' }}>
            Free to join. No credit card required.
          </p>
          <button
            onClick={() => router.push('/signup')}
            style={{ background: '#7C3AED', border: 'none', borderRadius: '10px', padding: '18px 40px', fontSize: '16px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = '#6D28D9'}
            onMouseLeave={e => e.currentTarget.style.background = '#7C3AED'}
          >
            Get started free →
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f0f0f0', padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 80 80">
            <rect x="4" y="4" width="52" height="42" rx="10" fill="#111111"/>
            <path d="M14 46 L10 62 L28 46Z" fill="#111111"/>
            <circle cx="18" cy="25" r="4" fill="#ffffff"/>
            <circle cx="30" cy="25" r="4" fill="#ffffff"/>
            <circle cx="42" cy="25" r="4" fill="#ffffff"/>
            <circle cx="58" cy="56" r="18" fill="#7C3AED"/>
            <path d="M52 47 L52 65 L70 56Z" fill="#ffffff"/>
          </svg>
          <span style={{ fontSize: '13px', color: '#aaa' }}>© 2026 Reelmates. Film is about community.</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <span style={{ fontSize: '13px', color: '#aaa', cursor: 'pointer' }}>Film data from TMDB</span>
        </div>
      </div>

    </div>
  )
}