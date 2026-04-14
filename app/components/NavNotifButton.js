'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function NavNotifButton() {
  const [count, setCount] = useState(0)
  const [total, setTotal] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchCount() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: myLogs }, { data: myPosts }] = await Promise.all([
        supabase.from('film_logs').select('id').eq('user_id', user.id),
        supabase.from('posts').select('id').eq('user_id', user.id)
      ])
      const myTargetIds = [
        ...(myLogs || []).map(l => l.id),
        ...(myPosts || []).map(p => p.id)
      ]

      const [{ count: likeCount }, { count: commentCount }, { count: notifCount }] = await Promise.all([
        myTargetIds.length > 0
          ? supabase.from('likes').select('*', { count: 'exact', head: true }).in('target_id', myTargetIds).neq('user_id', user.id)
          : Promise.resolve({ count: 0 }),
        myTargetIds.length > 0
          ? supabase.from('comments').select('*', { count: 'exact', head: true }).in('target_id', myTargetIds).neq('user_id', user.id)
          : Promise.resolve({ count: 0 }),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      ])

      const t = (likeCount || 0) + (commentCount || 0) + (notifCount || 0)
      const seenCount = parseInt(localStorage.getItem('notif_seen_count') || '0', 10)
      setTotal(t)
      setCount(Math.max(0, t - seenCount))
    }
    fetchCount()
  }, [])

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => {
          localStorage.setItem('notif_seen_count', String(total))
          setCount(0)
          router.push('/notifications')
        }}
        style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>
        Notifications
      </button>
      {count > 0 && (
        <div style={{
          position: 'absolute', top: '-7px', right: '-7px',
          background: '#EF4444', color: '#fff', borderRadius: '999px',
          minWidth: '18px', height: '18px', fontSize: '11px', fontWeight: '800',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px', border: '2px solid #fff', lineHeight: 1,
          pointerEvents: 'none'
        }}>
          {count > 99 ? '99+' : count}
        </div>
      )}
    </div>
  )
}
