'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import MiniProfile from '../components/MiniProfile'
import NavNotifButton from '../components/NavNotifButton'

export default function NotificationsPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('activity')

  // Activity
  const [activity, setActivity] = useState([])

  // Messages
  const [conversations, setConversations] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [reelmates, setReelmates] = useState([])
  const [showNewConvo, setShowNewConvo] = useState(false)

  const messagesEndRef = useRef(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await Promise.all([loadActivity(user), loadConversations(user), loadReelmates(user)])
      // Mark all notifications as seen
      localStorage.setItem('notif_seen_at', new Date().toISOString())
      setLoading(false)
    }
    init()
  }, [])

  async function loadActivity(u) {
    const { data: myPosts } = await supabase.from('posts').select('id').eq('user_id', u.id)
    const myPostIds = (myPosts || []).map(p => p.id)
    if (myPostIds.length === 0) return

    const [{ data: likes }, { data: comments }] = await Promise.all([
      supabase.from('likes')
        .select('created_at, user_id, post_id')
        .in('post_id', myPostIds)
        .neq('user_id', u.id)
        .order('created_at', { ascending: false }),
      supabase.from('comments')
        .select('id, content, created_at, user_id, post_id')
        .in('post_id', myPostIds)
        .neq('user_id', u.id)
        .order('created_at', { ascending: false })
    ])

    const allUserIds = [...new Set([
      ...(likes || []).map(l => l.user_id),
      ...(comments || []).map(c => c.user_id)
    ])]

    let profileMap = {}
    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', allUserIds)
      profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
    }

    const likeItems = (likes || []).map(l => ({ ...l, type: 'like', profile: profileMap[l.user_id] }))
    const commentItems = (comments || []).map(c => ({ ...c, type: 'comment', profile: profileMap[c.user_id] }))
    const merged = [...likeItems, ...commentItems].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setActivity(merged)
  }

  async function loadConversations(u) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, read')
      .or(`sender_id.eq.${u.id},recipient_id.eq.${u.id}`)
      .order('created_at', { ascending: false })

    if (!msgs || msgs.length === 0) return

    const partnerIds = [...new Set(msgs.map(m => m.sender_id === u.id ? m.recipient_id : m.sender_id))]
    const { data: profiles } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', partnerIds)
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

    const convoMap = new Map()
    for (const msg of msgs) {
      const partnerId = msg.sender_id === u.id ? msg.recipient_id : msg.sender_id
      if (!convoMap.has(partnerId)) {
        convoMap.set(partnerId, { profile: profileMap[partnerId], lastMessage: msg })
      }
    }
    setConversations([...convoMap.values()].filter(c => c.profile))
  }

  async function loadReelmates(u) {
    const { data } = await supabase.from('connections').select('following_id').eq('follower_id', u.id)
    const ids = (data || []).map(c => c.following_id)
    if (ids.length === 0) return
    const { data: profiles } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ids)
    setReelmates(profiles || [])
  }

  async function openConversation(profile) {
    setActiveConvo(profile)
    setShowNewConvo(false)
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${profile.id}),and(sender_id.eq.${profile.id},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    supabase.from('messages').update({ read: true })
      .eq('recipient_id', user.id).eq('sender_id', profile.id).eq('read', false)
  }

  async function sendMessage() {
    if (!newMessage.trim() || !activeConvo || sending) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')
    const { data, error } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: activeConvo.id,
      content
    }).select('id, sender_id, content, created_at').single()
    if (!error && data) {
      setMessages(prev => [...prev, data])
      setConversations(prev => {
        const filtered = prev.filter(c => c.profile.id !== activeConvo.id)
        return [{ profile: activeConvo, lastMessage: data }, ...filtered]
      })
    }
    setSending(false)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function timeAgo(ts) {
    if (!ts) return ''
    const diff = Date.now() - new Date(ts)
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ fontSize: '14px', color: '#aaa' }}>Loading…</div>
      </div>
    )
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
          <NavNotifButton />
          <MiniProfile />
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '48px 24px' }}>

        <div style={{ fontSize: '28px', fontWeight: '800', color: '#111', letterSpacing: '-0.5px', marginBottom: '32px' }}>Notifications</div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '2px solid #f0f0f0', marginBottom: '36px' }}>
          {[['activity', 'Activity'], ['messages', 'Messages']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ background: 'none', border: 'none', padding: '10px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                color: tab === key ? '#7C3AED' : '#aaa',
                borderBottom: tab === key ? '2px solid #7C3AED' : '2px solid transparent',
                marginBottom: '-2px', transition: 'color 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Activity tab ── */}
        {tab === 'activity' && (
          <div>
            {activity.length === 0 ? (
              <div style={{ border: '1px dashed #e0e0e0', borderRadius: '12px', padding: '56px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔔</div>
                <div style={{ fontSize: '15px', color: '#aaa' }}>No activity yet</div>
                <div style={{ fontSize: '13px', color: '#ccc', marginTop: '6px' }}>Likes and comments on your posts will appear here</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {activity.map((item, i) => {
                  const p = item.profile
                  const name = p?.full_name || p?.username || 'Someone'
                  return (
                    <div key={i}
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '10px', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {/* Avatar + type badge */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {p?.avatar_url ? (
                          <img src={p.avatar_url} alt={name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F3EEFF', border: '2px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: '#7C3AED' }}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderRadius: '50%', background: item.type === 'like' ? '#FEE2E2' : '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid #fff' }}>
                          {item.type === 'like' ? '♥' : '💬'}
                        </div>
                      </div>
                      {/* Text */}
                      <div style={{ flex: 1 }}>
                        <span
                          style={{ fontSize: '14px', fontWeight: '700', color: '#111', cursor: 'pointer' }}
                          onClick={() => p?.id && router.push(`/profile/${p.id}`)}>
                          {name}
                        </span>
                        {item.type === 'like' ? (
                          <span style={{ fontSize: '14px', color: '#555' }}> liked your post</span>
                        ) : (
                          <span style={{ fontSize: '14px', color: '#555' }}>
                            {' '}commented: <span style={{ fontStyle: 'italic', color: '#888' }}>"{item.content}"</span>
                          </span>
                        )}
                      </div>
                      {/* Time */}
                      <div style={{ fontSize: '12px', color: '#ccc', flexShrink: 0 }}>{timeAgo(item.created_at)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Messages tab ── */}
        {tab === 'messages' && (
          <div style={{ display: 'flex', gap: '24px', height: '600px' }}>

            {/* Sidebar */}
            <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => { setShowNewConvo(v => !v); setActiveConvo(null) }}
                style={{ width: '100%', background: '#7C3AED', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                + New Message
              </button>

              {/* Reelmates picker */}
              {showNewConvo && (
                <div style={{ border: '1px solid #f0f0f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f5f5f5', background: '#FAFAFA' }}>
                    Your Reelmates
                  </div>
                  {reelmates.length === 0 ? (
                    <div style={{ padding: '16px', fontSize: '13px', color: '#ccc', textAlign: 'center' }}>No reelmates yet</div>
                  ) : reelmates.map(rm => {
                    const name = rm.full_name || rm.username || 'Reelmate'
                    return (
                      <div key={rm.id} onClick={() => { openConversation(rm); setTab('messages') }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F3EEFF'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {rm.avatar_url ? (
                          <img src={rm.avatar_url} alt={name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F3EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', color: '#7C3AED' }}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>{name}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Conversation list */}
              {conversations.length === 0 && !showNewConvo && (
                <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed #e0e0e0', borderRadius: '10px' }}>
                  <div style={{ fontSize: '13px', color: '#ccc' }}>No messages yet</div>
                </div>
              )}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {conversations.map(({ profile: p, lastMessage }) => {
                  const name = p?.full_name || p?.username || 'Reelmate'
                  const isActive = activeConvo?.id === p?.id
                  return (
                    <div key={p?.id} onClick={() => openConversation(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', background: isActive ? '#F3EEFF' : 'transparent', marginBottom: '2px', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#FAFAFA' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? '#F3EEFF' : 'transparent' }}>
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt={name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F3EEFF', border: '2px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '800', color: '#7C3AED', flexShrink: 0 }}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>{name}</div>
                        <div style={{ fontSize: '12px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lastMessage?.content || ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Thread pane */}
            <div style={{ flex: 1, border: '1px solid #f0f0f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
              {!activeConvo ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '40px' }}>💬</div>
                  <div style={{ fontSize: '14px', color: '#aaa' }}>Select a conversation or start a new one</div>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    {activeConvo.avatar_url ? (
                      <img src={activeConvo.avatar_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F3EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#7C3AED' }}>
                        {(activeConvo.full_name || activeConvo.username || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>{activeConvo.full_name || activeConvo.username || 'Reelmate'}</div>
                      {activeConvo.username && <div style={{ fontSize: '12px', color: '#A78BFA' }}>@{activeConvo.username}</div>}
                    </div>
                  </div>

                  {/* Messages */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {messages.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#ccc', fontSize: '13px', marginTop: '40px' }}>No messages yet — say hello!</div>
                    )}
                    {messages.map(msg => {
                      const isMe = msg.sender_id === user?.id
                      return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            maxWidth: '68%', padding: '10px 14px',
                            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: isMe ? '#7C3AED' : '#F3EEFF',
                            color: isMe ? '#fff' : '#333',
                            fontSize: '14px', lineHeight: '1.55'
                          }}>
                            {msg.content}
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div style={{ padding: '14px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: '10px', flexShrink: 0 }}>
                    <input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                      placeholder="Write a message…"
                      style={{ flex: 1, padding: '10px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', color: '#333' }}
                      onFocus={e => e.target.style.borderColor = '#7C3AED'}
                      onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                    />
                    <button onClick={sendMessage} disabled={!newMessage.trim() || sending}
                      style={{ background: newMessage.trim() ? '#7C3AED' : '#e0e0e0', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '700', color: newMessage.trim() ? '#fff' : '#aaa', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'background 0.15s', flexShrink: 0 }}>
                      {sending ? '…' : 'Send'}
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
