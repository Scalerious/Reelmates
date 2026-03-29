import { NextResponse } from 'next/server'
import { createClient } from '../../lib/supabase'

export async function POST(request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { tmdb_id, title, poster_path, rating, review } = await request.json()

  const { error } = await supabase
    .from('film_logs')
    .upsert({
      user_id: user.id,
      tmdb_id,
      title,
      poster_path,
      rating,
      review
    }, { onConflict: 'user_id,tmdb_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}