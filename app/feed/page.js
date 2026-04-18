'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import MiniProfile from '../components/MiniProfile'
import NavNotifButton from '../components/NavNotifButton'

function Avatar({ profile, size = 38 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#F3EEFF', border: '2px solid #7C3AED', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.37, fontWeight: '800', color: '#7C3AED' }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : '?')
      }
    </div>
  )
}

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#7C3AED' : 'none'} stroke={filled ? '#7C3AED' : '#bbb'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function BubbleIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#7C3AED' : '#bbb'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function Feed() {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [submittingComment, setSubmittingComment] = useState({})
  const [openComments, setOpenComments] = useState({})
  const [likes, setLikes] = useState({}) // { 'type-id': { count, userLiked } }
  const [showCompose, setShowCompose] = useState(false)
  const [postBody, setPostBody] = useState('')
  const [postPhotoUrl, setPostPhotoUrl] = useState(null)
  const [postPhotoPreview, setPostPhotoPreview] = useState(null)
  const [postLink, setPostLink] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [submittingPost, setSubmittingPost] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [connecting, setConnecting] = useState(new Set())
  const [connectedIds, setConnectedIds] = useState(new Set())
  const photoInputRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Auto-open compose modal when landing from "Say Something" on another page
  useEffect(() => {
    if (searchParams.get('compose') === 'true') {
      setShowCompose(true)
      router.replace('/feed')
    }
  }, [searchParams])
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (!user.user_metadata?.onboarding_complete) { router.push('/onboarding'); return }
      setUser(user)

      const { data: connections } = await supabase
        .from('connections')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = (connections || []).map(c => c.following_id)
      const allIds = followingIds

      // Load taste-matched suggestions in parallel with the feed
      loadSuggestions(user.id, followingIds)

      const [{ data: logs }, { data: genericPosts }] = await Promise.all([
        supabase
          .from('film_logs')
          .select(`id, tmdb_id, title, poster_path, rating, review, logged_at, user_id,
            profiles ( id, username, full_name, avatar_url )`)
          .in('user_id', allIds)
          .order('logged_at', { ascending: false })
          .limit(50),
        supabase
          .from('posts')
          .select(`id, body, photo_url, link_url, created_at, user_id,
            profiles ( id, username, full_name, avatar_url )`)
          .in('user_id', allIds)
          .order('created_at', { ascending: false })
          .limit(50)
      ])

      const filmItems = (logs || []).map(l => ({ ...l, type: 'film', sortDate: l.logged_at }))
      const postItems = (genericPosts || []).map(p => ({ ...p, type: 'post', sortDate: p.created_at }))
      const merged = [...filmItems, ...postItems].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate))
      setPosts(merged)

      const allTargetIds = merged.map(i => i.id)
      if (!allTargetIds.length) { setLoading(false); return }

      const [{ data: allComments }, { data: allLikes }] = await Promise.all([
        supabase
          .from('comments')
          .select(`id, body, created_at, target_id, target_type, user_id,
            profiles ( username, full_name, avatar_url )`)
          .in('target_id', allTargetIds)
          .order('created_at', { ascending: true }),
        supabase
          .from('likes')
          .select('id, target_id, target_type, user_id')
          .in('target_id', allTargetIds)
      ])

      const groupedComments = {}
      for (const c of allComments || []) {
        const key = `${c.target_type}-${c.target_id}`
        if (!groupedComments[key]) groupedComments[key] = []
        groupedComments[key].push(c)
      }
      setComments(groupedComments)

      const groupedLikes = {}
      for (const l of allLikes || []) {
        const key = `${l.target_type}-${l.target_id}`
        if (!groupedLikes[key]) groupedLikes[key] = { count: 0, userLiked: false }
        groupedLikes[key].count++
        if (l.user_id === user.id) groupedLikes[key].userLiked = true
      }
      setLikes(groupedLikes)
      setLoading(false)
    }
    init()
  }, [])

  async function loadSuggestions(userId, followingIds) {
    const { data: myLogs } = await supabase
      .from('film_logs')
      .select('tmdb_id, rating')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(60)

    if (!myLogs || myLogs.length === 0) return

    const myTmdbIds = myLogs.map(l => l.tmdb_id)
    const myRatingMap = Object.fromEntries(myLogs.map(l => [l.tmdb_id, l.rating]))
    const excludeIds = [userId, ...followingIds]

    const { data: otherLogs } = await supabase
      .from('film_logs')
      .select('user_id, tmdb_id, rating, title, poster_path')
      .in('tmdb_id', myTmdbIds)
      .not('user_id', 'in', `(${excludeIds.join(',')})`)
      .limit(500)

    if (!otherLogs || otherLogs.length === 0) return

    const candidateMap = {}
    for (const log of otherLogs) {
      if (!candidateMap[log.user_id]) candidateMap[log.user_id] = { sharedFilms: [], score: 0 }
      const similarity = 5 - Math.abs((myRatingMap[log.tmdb_id] || 0) - (log.rating || 0))
      candidateMap[log.user_id].score += similarity
      if (candidateMap[log.user_id].sharedFilms.length < 3)
        candidateMap[log.user_id].sharedFilms.push(log)
    }

    const topCandidates = Object.entries(candidateMap)
      .filter(([, d]) => d.sharedFilms.length >= 2)
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, 5)

    if (topCandidates.length === 0) return

    const candidateIds = topCandidates.map(([id]) => id)

    const [{ data: profiles }, { data: recentLogs }] = await Promise.all([
      supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', candidateIds),
      supabase.from('film_logs')
        .select('user_id, tmdb_id, title, poster_path, rating, review, logged_at')
        .in('user_id', candidateIds)
        .order('logged_at', { ascending: false })
        .limit(candidateIds.length * 3)
    ])

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
    // Pick the most recent log per candidate
    const recentLogMap = {}
    for (const log of recentLogs || []) {
      if (!recentLogMap[log.user_id]) recentLogMap[log.user_id] = log
    }

    const results = topCandidates
      .map(([user_id, data]) => ({
        user_id,
        ...data,
        profile: profileMap[user_id],
        recentLog: recentLogMap[user_id] || null
      }))
      .filter(c => c.profile)

    setSuggestions(results)
  }

  async function handleConnect(targetUserId) {
    setConnecting(prev => new Set(prev).add(targetUserId))
    await supabase.from('connections').insert({ follower_id: user.id, following_id: targetUserId })
    setConnecting(prev => { const s = new Set(prev); s.delete(targetUserId); return s })
    setConnectedIds(prev => new Set(prev).add(targetUserId))
  }

  function timeAgo(dateString) {
    const now = new Date()
    const date = new Date(dateString)
    const seconds = Math.floor((now - date) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  async function handleToggleLike(targetId, targetType) {
    const key = `${targetType}-${targetId}`
    const current = likes[key] || { count: 0, userLiked: false }
    // Optimistic update
    setLikes(prev => ({
      ...prev,
      [key]: { count: current.userLiked ? current.count - 1 : current.count + 1, userLiked: !current.userLiked }
    }))
    if (current.userLiked) {
      const { error } = await supabase.from('likes').delete()
        .eq('user_id', user.id).eq('target_id', targetId).eq('target_type', targetType)
      if (error) setLikes(prev => ({ ...prev, [key]: current }))
    } else {
      const { error } = await supabase.from('likes').insert({ user_id: user.id, target_id: targetId, target_type: targetType })
      if (error) setLikes(prev => ({ ...prev, [key]: current }))
    }
  }

  function toggleComments(key) {
    setOpenComments(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleAddComment(targetId, targetType) {
    const key = `${targetType}-${targetId}`
    const body = (commentDrafts[key] || '').trim()
    if (!body) return
    setSubmittingComment(prev => ({ ...prev, [key]: true }))

    const { data, error } = await supabase
      .from('comments')
      .insert({ user_id: user.id, target_id: targetId, target_type: targetType, body })
      .select(`id, body, created_at, target_id, target_type, user_id,
        profiles ( username, full_name, avatar_url )`)
      .single()

    if (!error && data) {
      setComments(prev => ({ ...prev, [key]: [...(prev[key] || []), data] }))
      setCommentDrafts(prev => ({ ...prev, [key]: '' }))
    }
    setSubmittingComment(prev => ({ ...prev, [key]: false }))
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setPostPhotoPreview(URL.createObjectURL(file))
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('post-photos').upload(path, file)
    if (error) {
      alert('Photo upload failed: ' + error.message)
      setPostPhotoPreview(null)
      setUploadingPhoto(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('post-photos').getPublicUrl(path)
    setPostPhotoUrl(publicUrl)
    setUploadingPhoto(false)
  }

  function removePhoto() {
    setPostPhotoUrl(null)
    setPostPhotoPreview(null)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  function closeCompose() {
    setShowCompose(false)
    setPostBody('')
    setPostPhotoUrl(null)
    setPostPhotoPreview(null)
    setPostLink('')
    setShowLinkInput(false)
  }

  async function handleSubmitPost() {
    if (!postBody.trim() && !postPhotoUrl && !postLink.trim()) return
    setSubmittingPost(true)
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: user.id, body: postBody.trim() || null, photo_url: postPhotoUrl || null, link_url: postLink.trim() || null })
      .select('id, body, photo_url, link_url, created_at, user_id')
      .single()
    if (error) {
      alert('Post failed: ' + error.message)
      setSubmittingPost(false)
      return
    }
    if (data) {
      // Attach current user's profile data locally without re-fetching
      const { data: profileData } = await supabase.from('profiles').select('id, username, full_name, avatar_url').eq('id', user.id).single()
      setPosts(prev => [{ ...data, profiles: profileData, type: 'post', sortDate: data.created_at }, ...prev])
    }
    setSubmittingPost(false)
    closeCompose()
  }

  const canPost = (postBody.trim() || postPhotoUrl || postLink.trim()) && !uploadingPhoto

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Navbar */}
      <div style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
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
          <button onClick={() => setShowCompose(true)} style={{ background: '#7C3AED', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', color: '#fff' }}>Say Something</button>
          <button onClick={() => router.push('/films')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Log a Film</button>
          <button onClick={() => router.push('/users')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>Reelmates</button>
          <NavNotifButton />
          <MiniProfile />
        </div>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) closeCompose() }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '520px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#111' }}>Say Something</div>
              <button onClick={closeCompose} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#aaa', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <textarea autoFocus value={postBody} onChange={e => setPostBody(e.target.value)} placeholder="What's on your mind?" rows={4}
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: '15px', fontFamily: 'inherit', resize: 'none', color: '#111', lineHeight: '1.55', boxSizing: 'border-box' }} />
              {postPhotoPreview && (
                <div style={{ position: 'relative', marginTop: '12px', display: 'inline-block' }}>
                  <img src={postPhotoPreview} alt="" style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '10px', objectFit: 'cover', display: 'block', opacity: uploadingPhoto ? 0.5 : 1 }} />
                  {uploadingPhoto && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#fff', fontWeight: '700' }}>Uploading...</div>}
                  {!uploadingPhoto && <button onClick={removePhoto} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', color: '#fff', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>}
                </div>
              )}
              {showLinkInput && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: '#F3EEFF', border: '1px solid #DDD6FE', borderRadius: '8px', padding: '10px 12px' }}>
                  <span style={{ fontSize: '14px' }}>🔗</span>
                  <input type="url" value={postLink} onChange={e => setPostLink(e.target.value)} placeholder="Paste a link..."
                    style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '13px', fontFamily: 'inherit', color: '#6D28D9' }} />
                  {postLink && <button onClick={() => { setPostLink(''); setShowLinkInput(false) }} style={{ background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer', fontSize: '14px', padding: 0 }}>✕</button>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} title="Add photo"
                  style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '7px 10px', fontSize: '16px', cursor: 'pointer', color: postPhotoUrl ? '#7C3AED' : '#aaa', lineHeight: 1 }}>🖼</button>
                <button onClick={() => setShowLinkInput(v => !v)} title="Add link"
                  style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '7px 10px', fontSize: '16px', cursor: 'pointer', color: postLink ? '#7C3AED' : '#aaa', lineHeight: 1 }}>🔗</button>
              </div>
              <button onClick={handleSubmitPost} disabled={!canPost || submittingPost}
                style={{ background: canPost ? '#7C3AED' : '#e0e0e0', color: canPost ? '#fff' : '#aaa', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '14px', fontWeight: '700', cursor: canPost ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                {submittingPost ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111', margin: '0 0 6px', letterSpacing: '-0.5px' }}>My Feed</h1>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>What your Reelmates are watching.</p>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '60px 0', fontSize: '14px', color: '#aaa' }}>Loading your feed...</div>}

        {!loading && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <svg width="64" height="64" viewBox="0 0 80 80" style={{ marginBottom: '20px', opacity: 0.2 }}>
              <rect x="4" y="4" width="52" height="42" rx="10" fill="#111111"/>
              <path d="M14 46 L10 62 L28 46Z" fill="#111111"/>
              <circle cx="18" cy="25" r="4" fill="#ffffff"/>
              <circle cx="30" cy="25" r="4" fill="#ffffff"/>
              <circle cx="42" cy="25" r="4" fill="#ffffff"/>
              <circle cx="58" cy="56" r="18" fill="#7C3AED"/>
              <path d="M52 47 L52 65 L70 56Z" fill="#ffffff"/>
            </svg>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#ccc', marginBottom: '8px' }}>Your feed is empty</div>
            <div style={{ fontSize: '14px', color: '#ddd', marginBottom: '24px' }}>Connect with other Reelmates to see what they're watching.</div>
            <button onClick={() => router.push('/users')} style={{ background: '#7C3AED', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              Find Reelmates →
            </button>
          </div>
        )}

        {!loading && (posts.length > 0 || suggestions.filter(s => !connectedIds.has(s.user_id)).length > 0) && (() => {
          // Weave suggestion cards into the post list
          const activeSuggestions = suggestions.filter(s => !connectedIds.has(s.user_id))
          const items = []
          let suggIdx = 0
          for (let i = 0; i < posts.length; i++) {
            items.push({ kind: 'post', data: posts[i] })
            if (suggIdx < activeSuggestions.length && (i === 2 || (i > 2 && (i - 2) % 6 === 0)))
              items.push({ kind: 'suggestion', data: activeSuggestions[suggIdx++] })
          }
          // If feed is empty, show remaining suggestions at top
          while (suggIdx < activeSuggestions.length)
            items.push({ kind: 'suggestion', data: activeSuggestions[suggIdx++] })

          return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {items.map(item => {
              if (item.kind === 'suggestion') {
                const s = item.data
                const isConnecting = connecting.has(s.user_id)
                const isConnected = connectedIds.has(s.user_id)
                const log = s.recentLog
                return (
                  <div key={`sugg-${s.user_id}`} style={{ border: '1px solid #EDE9FE', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                    {/* Banner */}
                    <div style={{ background: '#F3EEFF', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#7C3AED', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Suggested · {s.sharedFilms.length} films in common
                      </span>
                    </div>
                    {/* Author row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ cursor: 'pointer' }} onClick={() => router.push(s.profile.username ? `/${s.profile.username}` : `/profile/${s.user_id}`)}>
                        <Avatar profile={s.profile} size={38} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#111', cursor: 'pointer' }} onClick={() => router.push(s.profile.username ? `/${s.profile.username}` : `/profile/${s.user_id}`)}>
                          {s.profile.full_name || s.profile.username}
                        </div>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>@{s.profile.username}</div>
                      </div>
                      <button
                        onClick={() => !isConnected && !isConnecting && handleConnect(s.user_id)}
                        disabled={isConnecting || isConnected}
                        style={{
                          background: isConnected ? '#F0FDF4' : '#7C3AED',
                          border: isConnected ? '1px solid #BBF7D0' : 'none',
                          borderRadius: '6px', padding: '7px 16px',
                          fontSize: '13px', fontWeight: '700',
                          color: isConnected ? '#166534' : '#fff',
                          cursor: isConnected || isConnecting ? 'default' : 'pointer',
                          fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.15s'
                        }}>
                        {isConnecting ? '…' : isConnected ? '✓ Connected' : '+ Connect'}
                      </button>
                    </div>
                    {/* Most recent log */}
                    {log && (
                      <div style={{ display: 'flex', gap: '14px', padding: '16px', cursor: 'pointer' }} onClick={() => router.push(`/film/${log.tmdb_id}`)}>
                        {log.poster_path
                          ? <img src={`https://image.tmdb.org/t/p/w185${log.poster_path}`} alt={log.title} style={{ width: '70px', height: '105px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: '70px', height: '105px', borderRadius: '6px', background: '#F3EEFF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎬</div>
                        }
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '17px', fontWeight: '800', color: '#111', marginBottom: '6px', letterSpacing: '-0.3px' }}>{log.title}</div>
                          <div style={{ display: 'inline-flex', gap: '1px', marginBottom: '10px' }}>
                            {[1,2,3,4,5].map(n => {
                              const fill = Math.min(1, Math.max(0, (log.rating || 0) - (n - 1)))
                              return (
                                <span key={n} style={{ position: 'relative', display: 'inline-block', fontSize: '16px', lineHeight: 1, color: '#e0e0e0' }}>
                                  ★<span style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: `${fill * 100}%`, color: '#7C3AED', whiteSpace: 'nowrap' }}>★</span>
                                </span>
                              )
                            })}
                          </div>
                          {log.review && <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.55', fontStyle: 'italic' }}>"{log.review}"</div>}
                          <div style={{ fontSize: '11px', color: '#A78BFA', marginTop: '8px', fontWeight: '600' }}>View film →</div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }

              const post = item.data
              const key = `${post.type}-${post.id}`
              const postLikes = likes[key] || { count: 0, userLiked: false }
              const postComments = comments[key] || []
              const commentsOpen = !!openComments[key]
              const draft = commentDrafts[key] || ''
              const busy = submittingComment[key] || false

              return (
                <div key={key} style={{ border: '1px solid #f0f0f0', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>

                  {/* Author row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid #f5f5f5' }}>
                    <div onClick={() => post.user_id !== user.id && router.push(post.profiles?.username ? `/${post.profiles.username}` : `/profile/${post.user_id}`)} style={{ cursor: post.user_id !== user.id ? 'pointer' : 'default' }}>
                      <Avatar profile={post.profiles} size={38} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#111', cursor: post.user_id !== user.id ? 'pointer' : 'default', display: 'inline' }}
                        onClick={() => post.user_id !== user.id && router.push(post.profiles?.username ? `/${post.profiles.username}` : `/profile/${post.user_id}`)}>
                        {post.profiles?.full_name || post.profiles?.username}
                        {post.user_id === user.id && <span style={{ fontSize: '11px', color: '#A78BFA', marginLeft: '6px', fontWeight: '600' }}>you</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#aaa' }}>@{post.profiles?.username} · {timeAgo(post.sortDate)}</div>
                    </div>
                  </div>

                  {/* Film log body */}
                  {post.type === 'film' && (
                    <div style={{ display: 'flex', gap: '14px', padding: '16px', cursor: 'pointer' }} onClick={() => router.push(`/film/${post.tmdb_id}`)}>
                      {post.poster_path
                        ? <img src={`https://image.tmdb.org/t/p/w185${post.poster_path}`} alt={post.title} style={{ width: '70px', height: '105px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: '70px', height: '105px', borderRadius: '6px', background: '#F3EEFF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎬</div>
                      }
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px', fontWeight: '800', color: '#111', marginBottom: '6px', letterSpacing: '-0.3px' }}>{post.title}</div>
                        <div style={{ display: 'inline-flex', gap: '1px', marginBottom: '10px' }}>
                          {[1,2,3,4,5].map(n => {
                            const fill = Math.min(1, Math.max(0, (post.rating || 0) - (n - 1)))
                            return (
                              <span key={n} style={{ position: 'relative', display: 'inline-block', fontSize: '16px', lineHeight: 1, color: '#e0e0e0' }}>
                                ★
                                <span style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: `${fill * 100}%`, color: '#7C3AED', whiteSpace: 'nowrap' }}>★</span>
                              </span>
                            )
                          })}
                        </div>
                        {post.review && <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.55', fontStyle: 'italic' }}>"{post.review}"</div>}
                        <div style={{ fontSize: '11px', color: '#A78BFA', marginTop: '8px', fontWeight: '600' }}>View film →</div>
                      </div>
                    </div>
                  )}

                  {/* Generic post body */}
                  {post.type === 'post' && (
                    <div style={{ padding: '16px' }}>
                      {post.body && <div style={{ fontSize: '15px', color: '#111', lineHeight: '1.55', marginBottom: (post.photo_url || post.link_url) ? '14px' : 0 }}>{post.body}</div>}
                      {post.photo_url && <img src={post.photo_url} alt="" style={{ width: '100%', borderRadius: '10px', objectFit: 'cover', display: 'block', marginBottom: post.link_url ? '12px' : 0 }} />}
                      {post.link_url && (
                        <a href={post.link_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F3EEFF', border: '1px solid #DDD6FE', borderRadius: '8px', padding: '10px 12px', textDecoration: 'none' }}>
                          <span style={{ fontSize: '14px' }}>🔗</span>
                          <span style={{ fontSize: '13px', color: '#6D28D9', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.link_url}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Action bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 16px', borderTop: '1px solid #f5f5f5' }}>
                    <button
                      onClick={() => handleToggleLike(post.id, post.type)}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: postLikes.userLiked ? '#7C3AED' : '#aaa' }}
                    >
                      <HeartIcon filled={postLikes.userLiked} />
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{postLikes.count || 0}</span>
                    </button>
                    <button
                      onClick={() => toggleComments(key)}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: commentsOpen ? '#7C3AED' : '#aaa' }}
                    >
                      <BubbleIcon active={commentsOpen} />
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{postComments.length}</span>
                    </button>
                  </div>

                  {/* Comments — only visible when open */}
                  {commentsOpen && (
                    <div style={{ borderTop: '1px solid #f5f5f5', padding: '12px 16px', background: '#fafafa' }}>
                      {postComments.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                          {postComments.map(c => (
                            <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <Avatar profile={c.profiles} size={26} />
                              <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '7px 10px', flex: 1 }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#111', marginRight: '6px' }}>
                                  {c.profiles?.full_name || c.profiles?.username}
                                </span>
                                <span style={{ fontSize: '13px', color: '#444', lineHeight: '1.45' }}>{c.body}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Avatar profile={post.profiles} size={26} />
                        <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '20px', padding: '6px 12px' }}>
                          <input
                            type="text"
                            value={draft}
                            onChange={e => setCommentDrafts(prev => ({ ...prev, [key]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(post.id, post.type) } }}
                            placeholder="Add a comment…"
                            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '13px', fontFamily: 'inherit', background: 'none', color: '#111' }}
                          />
                          {draft.trim() && (
                            <button onClick={() => handleAddComment(post.id, post.type)} disabled={busy}
                              style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', padding: 0, flexShrink: 0 }}>
                              {busy ? '…' : 'Post'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )
            })}
          </div>
          )
        })()}
      </div>
    </div>
  )
}


export default function FeedPage() {
  return (
    <Suspense>
      <Feed />
    </Suspense>
  )
}
