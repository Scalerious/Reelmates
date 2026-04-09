export async function GET(request, { params }) {
  const { tmdb_id } = await params
  const key = process.env.TMDB_API_KEY

  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdb_id}?append_to_response=credits&api_key=${key}`
  )

  if (!res.ok) {
    return Response.json({ error: 'Film not found' }, { status: 404 })
  }

  const data = await res.json()

  const crew = data.credits?.crew || []
  const cast = data.credits?.cast || []

  const directors = crew.filter(p => p.job === 'Director').map(p => p.name)
  const writers = crew.filter(p => p.job === 'Screenplay' || p.job === 'Writer' || p.job === 'Story').map(p => p.name)
  const topCast = cast.slice(0, 4).map(p => ({
    name: p.name,
    character: p.character,
    profile_path: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : null
  }))

  return Response.json({
    tmdb_id: data.id,
    title: data.title,
    year: data.release_date ? data.release_date.slice(0, 4) : '',
    overview: data.overview,
    poster_path: data.poster_path,
    backdrop_path: data.backdrop_path,
    runtime: data.runtime,
    genres: (data.genres || []).map(g => g.name),
    directors,
    writers,
    cast: topCast
  })
}
