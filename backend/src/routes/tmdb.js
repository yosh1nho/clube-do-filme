const { Router } = require('express');

const router = Router();

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

router.get('/busca', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Mínimo de 2 caracteres' });
  }

  try {
    const url = `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&language=pt-BR&query=${encodeURIComponent(q)}&page=1`;
    const tmdbRes = await fetch(url);
    const data = await tmdbRes.json();

    if (!data.results || data.status_code) {
      return res.status(400).json({ error: data.status_message || 'Erro na API TMDB' });
    }

    const filmes = data.results.map(f => ({
      tmdb_id: f.id,
      titulo: f.title,
      ano: f.release_date ? f.release_date.split('-')[0] : null,
      poster: f.poster_path ? `https://image.tmdb.org/t/p/w342${f.poster_path}` : null,
      poster_grande: f.poster_path ? `https://image.tmdb.org/t/p/w500${f.poster_path}` : null,
      sinopse: f.overview
    }));

    res.json(filmes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/detalhes/:id', async (req, res) => {
  try {
    const url = `${TMDB_BASE}/movie/${req.params.id}?api_key=${TMDB_KEY}&language=pt-BR&append_to_response=credits`;
    const tmdbRes = await fetch(url);
    const data = await tmdbRes.json();

    if (data.status_code) {
      return res.status(400).json({ error: data.status_message });
    }

    const diretor = data.credits?.crew?.find(p => p.job === 'Director');

    res.json({
      tmdb_id: data.id,
      titulo: data.title,
      ano: data.release_date ? data.release_date.split('-')[0] : null,
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      sinopse: data.overview,
      diretor: diretor?.name || null,
      generos: (data.genres || []).map(g => g.name)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
