require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function supabaseFetch(path, opts = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...opts.headers
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function fetchTmdb(path) {
  const url = `${TMDB_BASE}${path}?api_key=${TMDB_API_KEY}&language=pt-BR`;
  const res = await fetch(url);
  return res.json();
}

async function backfillFilme(filme) {
  console.log(`\nBackfilling: ${filme.titulo} (tmdb_id: ${filme.tmdb_id})`);

  const data = await fetchTmdb(`/movie/${filme.tmdb_id}?append_to_response=credits,videos,release_dates,watch/providers`);

  if (data.status_code) {
    console.error(`  Erro TMDB: ${data.status_message}`);
    return;
  }

  const duracao = data.runtime;
  const backdrop = data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null;
  const nota = data.vote_average;
  const votos = data.vote_count;

  const generos = (data.genres || []).map(g => ({ id: g.id, nome: g.name }));

  const brRelease = data.release_dates?.results?.find(r => r.iso_3166_1 === 'BR');
  const classificacao = brRelease?.release_dates?.[0]?.certification || null;

  const providersBR = data['watch/providers']?.results?.BR;
  const providers = providersBR ? {
    flatrate: (providersBR.flatrate || []).map(p => p.provider_name),
    rent: (providersBR.rent || []).map(p => p.provider_name),
    buy: (providersBR.buy || []).map(p => p.provider_name)
  } : null;

  const updateData = {
    duracao_min: duracao,
    backdrop_url: backdrop,
    providers: providers,
    nota_tmdb: nota,
    votos_tmdb: votos
  };

  try {
    await supabaseFetch(`filmes?id=eq.${filme.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
    console.log(`  ✓ Atualizado: ${duracao}min, nota ${nota}, ${generos.length} generos`);
  } catch (error) {
    console.error(`  Erro update filme:`, error.message);
  }

  for (const genero of generos) {
    const generoExistente = await supabaseFetch(`generos?id=eq.${genero.id}&select=id`).catch(() => []);

    if (!generoExistente || generoExistente.length === 0) {
      await supabaseFetch('generos', {
        method: 'POST',
        body: JSON.stringify({ id: genero.id, nome: genero.nome })
      }).catch(() => {});
    }

    const linkExistente = await supabaseFetch(`filme_generos?filme_id=eq.${filme.id}&genero_id=eq.${genero.id}&select=filme_id`).catch(() => []);

    if (!linkExistente || linkExistente.length === 0) {
      await supabaseFetch('filme_generos', {
        method: 'POST',
        body: JSON.stringify({ filme_id: filme.id, genero_id: genero.id })
      }).catch(() => {});
    }
  }

  console.log(`  ✓ ${generos.length} generos vinculados`);
}

async function main() {
  console.log('Iniciando backfill de filmes...');

  const filmes = await supabaseFetch('filmes?nota_tmdb=is.null&select=id,titulo,tmdb_id');

  if (!filmes || filmes.length === 0) {
    console.log('Nenhum filme precisa de backfill.');
    return;
  }

  console.log(`${filmes.length} filme(s) para backfill`);

  for (const filme of filmes) {
    await backfillFilme(filme);
  }

  console.log('\nBackfill concluido!');
}

main().catch(console.error);
