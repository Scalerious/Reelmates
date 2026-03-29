import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const { tmdb_id, title, poster_path, rating, review, user_id } = await request.json()

  if (!user_id) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { error } = await supabase
    .from('film_logs')
    .upsert({
      user_id,
      tmdb_id,
      title,
      poster_path,
      rating,
      review
    }, { onConflict: 'user_id,tmdb_id' })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}