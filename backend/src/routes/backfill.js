const { Router } = require('express');
const supabase = require('../supabase');

const router = Router();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

console.log('[backfill] TMDB_API_KEY loaded:', TMDB_API_KEY ? 'YES (length ' + TMDB_API_KEY.length + ')' : 'NO');

async function fetchTmdb(path) {
  const url = `${TMDB_BASE}${path}?api_key=${TMDB_API_KEY}&language=pt-BR`;
  console.log('[backfill] Fetching TMDB:', url.substring(0, 80) + '...');
  const res = await fetch(url);
  const data = await res.json();
  if (data.status_code) {
    console.log('[backfill] TMDB error:', data.status_message);
  }
  return data;
}

router.get('/test', (req, res) => {
  res.json({
    TMDB_API_KEY: TMDB_API_KEY ? 'present (length ' + TMDB_API_KEY.length + ')' : 'missing',
    SUPABASE_URL: process.env.SUPABASE_URL ? 'present' : 'missing'
  });
});

router.post('/', async (req, res) => {
  try {
    console.log('[backfill] Starting backfill, TMDB_API_KEY:', TMDB_API_KEY ? 'present' : 'missing');
    const sb = supabase.serviceClient || supabase;

    const { data: filmes, error } = await sb
      .from('filmes')
      .select('id, titulo, tmdb_id')
      .is('nota_tmdb', null);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!filmes || filmes.length === 0) {
      return res.json({ message: 'Nenhum filme precisa de backfill', count: 0 });
    }

    const results = [];

    for (const filme of filmes) {
      try {
        const data = await fetchTmdb(`/movie/${filme.tmdb_id}?append_to_response=credits,videos,release_dates,watch/providers`);

        if (data.status_code) {
          results.push({ id: filme.id, titulo: filme.titulo, error: data.status_message });
          continue;
        }

        const duracao = data.runtime;
        const backdrop = data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null;
        const nota = data.vote_average;
        const votos = data.vote_count;

        const generos = (data.genres || []).map(g => ({ id: g.id, nome: g.name }));

        const providersBR = data['watch/providers']?.results?.BR;
        const providers = providersBR ? {
          flatrate: (providersBR.flatrate || []).map(p => p.provider_name),
          rent: (providersBR.rent || []).map(p => p.provider_name),
          buy: (providersBR.buy || []).map(p => p.provider_name)
        } : null;

        await sb
          .from('filmes')
          .update({
            duracao_min: duracao,
            backdrop_url: backdrop,
            providers: providers,
            nota_tmdb: nota,
            votos_tmdb: votos
          })
          .eq('id', filme.id);

        for (const genero of generos) {
          const { data: generoExistente } = await sb
            .from('generos')
            .select('id')
            .eq('id', genero.id)
            .maybeSingle();

          if (!generoExistente) {
            await sb.from('generos').insert({ id: genero.id, nome: genero.nome });
          }

          const { data: linkExistente } = await sb
            .from('filme_generos')
            .select('filme_id')
            .eq('filme_id', filme.id)
            .eq('genero_id', genero.id)
            .maybeSingle();

          if (!linkExistente) {
            await sb.from('filme_generos').insert({ filme_id: filme.id, genero_id: genero.id });
          }
        }

        results.push({
          id: filme.id,
          titulo: filme.titulo,
          success: true,
          duracao,
          nota,
          generos: generos.length
        });
      } catch (err) {
        results.push({ id: filme.id, titulo: filme.titulo, error: err.message });
      }
    }

    res.json({ message: 'Backfill concluido', count: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
