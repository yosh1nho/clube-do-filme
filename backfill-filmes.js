require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

async function apiFetch(path, opts = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...opts.headers
  };
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${opts.method || 'GET'} ${path} -> ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function tmdbFetch(path) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${TMDB_BASE}${path}${sep}api_key=${TMDB_KEY}&language=pt-BR`;
  const res = await fetch(url);
  return res.json();
}

async function backfill() {
  console.log('Buscando filmes sem dados enriquecidos...');

  const filmes = await apiFetch('filmes?select=id,tmdb_id,titulo&nota_tmdb=is.null');

  if (!filmes || filmes.length === 0) {
    console.log('Nenhum filme precisa de backfill.');
    return;
  }

  console.log(`${filmes.length} filme(s) para atualizar:`);
  filmes.forEach(f => console.log(`  - ${f.titulo} (tmdb_id: ${f.tmdb_id})`));

  for (const filme of filmes) {
    console.log(`\nAtualizando: ${filme.titulo}...`);

    try {
      const data = await tmdbFetch(
        `/movie/${filme.tmdb_id}?append_to_response=credits,release_dates,watch/providers`
      );

      if (data.status_code) {
        console.error(`  Erro TMDB: ${data.status_message}`);
        continue;
      }

      const generos = (data.genres || []).map(g => ({ id: g.id, nome: g.name }));
      const backdrop = data.backdrop_path ? `${TMDB_IMG}/w1280${data.backdrop_path}` : null;

      const providers = (() => {
        const brProv = data['watch/providers']?.results?.BR;
        if (!brProv) return null;
        const fmt = (items, tipo) =>
          (items || []).map(p => ({
            nome: p.provider_name,
            logo: p.logo_path ? `${TMDB_IMG}/w92${p.logo_path}` : null,
            tipo
          }));
        const all = [
          ...fmt(brProv.flatrate, 'streaming'),
          ...fmt(brProv.rent, 'aluguel'),
          ...fmt(brProv.buy, 'compra')
        ];
        return all.length ? all : null;
      })();

      for (const g of generos) {
        await apiFetch('generos', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ id: g.id, nome: g.nome })
        });
      }

      const existentes = await apiFetch(`filme_generos?select=genero_id&filme_id=eq.${filme.id}`);
      const existentesIds = new Set((existentes || []).map(e => e.genero_id));

      for (const g of generos) {
        if (!existentesIds.has(g.id)) {
          await apiFetch('filme_generos', {
            method: 'POST',
            body: JSON.stringify({ filme_id: filme.id, genero_id: g.id })
          });
        }
      }

      await apiFetch(`filmes?id=eq.${filme.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          duracao_min: data.runtime || null,
          backdrop_url: backdrop,
          providers: providers ? JSON.stringify(providers) : null,
          nota_tmdb: data.vote_average || null,
          votos_tmdb: data.vote_count || null
        })
      });

      console.log(`  OK: ${generos.length} generos, ${data.runtime}min, nota ${data.vote_average}`);
      if (providers) console.log(`  Providers: ${providers.map(p => p.nome).join(', ')}`);
    } catch (err) {
      console.error(`  Erro: ${err.message}`);
    }
  }

  console.log('\nBackfill concluido.');
}

backfill().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
