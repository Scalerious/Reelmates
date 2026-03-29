export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  console.log('query:', query)
  console.log('api key:', process.env.TMDB_API_KEY)

  if (!query) {
    return Response.json({ results: [] })
  }

  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${process.env.TMDB_API_KEY}&include_adult=false`
  )

  const data = await res.json()
  console.log('tmdb response:', data)

  return Response.json({
    results: (data.results || []).slice(0, 8).map(film => ({
      id: film.id,
      title: film.title,
      year: film.release_date ? film.release_date.slice(0, 4) : '',
      poster: film.poster_path
        ? `https://image.tmdb.org/t/p/w185${film.poster_path}`
        : null,
      overview: film.overview,
      rating: film.vote_average
    }))
  })
}