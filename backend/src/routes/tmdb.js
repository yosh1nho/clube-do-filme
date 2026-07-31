const { Router } = require('express');

const router = Router();

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

let generosCache = null;
let generosCacheTime = 0;

async function tmdbFetch(path) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${TMDB_BASE}${path}${sep}api_key=${TMDB_KEY}&language=pt-BR`;
  const res = await fetch(url);
  return res.json();
}

function extrairBR(releaseDates) {
  const br = (releaseDates?.results || []).find(r => r.iso_3166_1 === 'BR');
  if (!br) return null;
  const cert = br.release_dates.find(r => r.certification)?.certification;
  return cert || null;
}

function extrairProviders(watchProviders) {
  const br = watchProviders?.results?.BR;
  if (!br) return null;

  const seen = new Set();
  const providers = (br.flatrate || [])
    .filter(p => {
      if (seen.has(p.provider_name)) return false;
      seen.add(p.provider_name);
      return true;
    })
    .map(p => ({
      nome: p.provider_name,
      logo: p.logo_path ? `${TMDB_IMG}/w92${p.logo_path}` : null
    }));

  return providers.length ? providers : null;
}

router.get('/busca', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Minimo de 2 caracteres' });
  }

  try {
    const data = await tmdbFetch(`/search/movie?query=${encodeURIComponent(q)}&page=1`);

    if (!data.results || data.status_code) {
      return res.status(400).json({ error: data.status_message || 'Erro na API TMDB' });
    }

    const filmes = data.results.map(f => ({
      tmdb_id: f.id,
      titulo: f.title,
      ano: f.release_date ? f.release_date.split('-')[0] : null,
      poster: f.poster_path ? `${TMDB_IMG}/w500${f.poster_path}` : null,
      poster_grande: f.poster_path ? `${TMDB_IMG}/w780${f.poster_path}` : null,
      sinopse: f.overview
    }));

    res.json(filmes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/detalhes/:id', async (req, res) => {
  try {
    const data = await tmdbFetch(
      `/movie/${req.params.id}?append_to_response=credits,videos,release_dates,watch/providers`
    );

    if (data.status_code) {
      return res.status(400).json({ error: data.status_message });
    }

    const diretor = data.credits?.crew?.find(p => p.job === 'Director');
    const elenco = (data.credits?.cast || []).slice(0, 5).map(p => ({
      nome: p.name,
      personagem: p.character
    }));

    const trailers = (data.videos?.results || [])
      .filter(v => v.site === 'YouTube' && v.type === 'Trailer')
      .slice(0, 3)
      .map(v => ({
        nome: v.name,
        key: v.key
      }));

    res.json({
      tmdb_id: data.id,
      titulo: data.title,
      ano: data.release_date ? data.release_date.split('-')[0] : null,
      poster: data.poster_path ? `${TMDB_IMG}/w780${data.poster_path}` : null,
      backdrop: data.backdrop_path ? `${TMDB_IMG}/w1280${data.backdrop_path}` : null,
      sinopse: data.overview,
      tagline: data.tagline || null,
      diretor: diretor?.name || null,
      elenco,
      generos: (data.genres || []).map(g => ({ id: g.id, nome: g.name })),
      duracao: data.runtime || null,
      nota_tmdb: data.vote_average || null,
      votos_tmdb: data.vote_count || null,
      trailers,
      providers: extrairProviders(data['watch/providers'])
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/generos', async (req, res) => {
  try {
    const agora = Date.now();
    if (generosCache && agora - generosCacheTime < 24 * 60 * 60 * 1000) {
      return res.json(generosCache);
    }

    const data = await tmdbFetch('/genre/movie/list');
    const lista = (data.genres || []).map(g => ({ id: g.id, nome: g.name }));
    generosCache = lista;
    generosCacheTime = agora;
    res.json(lista);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sugestoes', async (req, res) => {
  try {
    const supabase = require('../supabase');
    const sb = supabase.serviceClient || supabase;

    const { data: quinzenas } = await sb
      .from('quinzenas')
      .select('filme_id')
      .in('status', ['EM_CARTAZ', 'ENCERRADA']);

    const filmeIds = [...new Set((quinzenas || []).map(q => q.filme_id))];

    let generoFrequencia = {};
    if (filmeIds.length > 0) {
      const { data: filmesComGeneros } = await sb
        .from('filmes')
        .select('id, filme_generos(genero_id)')
        .in('id', filmeIds);

      (filmesComGeneros || []).forEach(f => {
        (f.filme_generos || []).forEach(fg => {
          generoFrequencia[fg.genero_id] = (generoFrequencia[fg.genero_id] || 0) + 1;
        });
      });
    }

    const topGeneros = Object.entries(generoFrequencia)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);

    const { data: filmesExistentes } = await sb
      .from('filmes')
      .select('tmdb_id');
    const tmdbIdsExcluidos = new Set((filmesExistentes || []).map(f => f.tmdb_id));

    let data;
    if (topGeneros.length > 0) {
      data = await tmdbFetch(
        `/discover/movie?with_genres=${topGeneros.join(',')}&sort_by=popularity.desc&page=1`
      );
    } else {
      data = await tmdbFetch('/trending/movie/week');
    }

    const sugestoes = (data.results || [])
      .filter(f => !tmdbIdsExcluidos.has(f.id))
      .slice(0, 12)
      .map(f => ({
        tmdb_id: f.id,
        titulo: f.title,
        ano: f.release_date ? f.release_date.split('-')[0] : null,
        poster: f.poster_path ? `${TMDB_IMG}/w500${f.poster_path}` : null,
        sinopse: f.overview,
        nota_tmdb: f.vote_average || null
      }));

    res.json(sugestoes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
