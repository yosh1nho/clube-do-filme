const { Router } = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = Router();

function authed(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

// Listar todos os filmes salvos na watchlist do usuário logado
router.get('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const sb = authed(token);
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Usuario nao autenticado' });

    const { data, error } = await sb
      .from('watchlist')
      .select('*')
      .eq('usuario_id', user.id)
      .order('criado_em', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    console.error('GET /api/watchlist error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Retorna apenas a lista de tmdb_id salvos pelo usuário (para marcação rápida nos cards)
router.get('/ids', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const sb = authed(token);
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Usuario nao autenticado' });

    const { data, error } = await sb
      .from('watchlist')
      .select('tmdb_id')
      .eq('usuario_id', user.id);

    if (error) return res.status(500).json({ error: error.message });
    const ids = (data || []).map(item => Number(item.tmdb_id));
    res.json(ids);
  } catch (err) {
    console.error('GET /api/watchlist/ids error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Adicionar filme à watchlist
router.post('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const sb = authed(token);
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Usuario nao autenticado' });

    const { tmdb_id, titulo, poster_url, ano, sinopse, nota_tmdb, generos, nota_pessoal } = req.body;

    if (!tmdb_id || !titulo) {
      return res.status(400).json({ error: 'tmdb_id e titulo sao obrigatorios' });
    }

    const { data, error } = await sb
      .from('watchlist')
      .upsert({
        usuario_id: user.id,
        tmdb_id: Number(tmdb_id),
        titulo,
        poster_url: poster_url || null,
        ano: ano ? String(ano) : null,
        sinopse: sinopse || null,
        nota_tmdb: nota_tmdb !== undefined && nota_tmdb !== null ? Number(nota_tmdb) : null,
        generos: generos || null,
        nota_pessoal: nota_pessoal ? nota_pessoal.trim() : null
      }, { onConflict: 'usuario_id, tmdb_id' })
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('POST /api/watchlist error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remover filme da watchlist pelo tmdb_id
router.delete('/:tmdb_id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const sb = authed(token);
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Usuario nao autenticado' });

    const tmdbId = Number(req.params.tmdb_id);
    const { error } = await sb
      .from('watchlist')
      .delete()
      .eq('usuario_id', user.id)
      .eq('tmdb_id', tmdbId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ removido: true, tmdb_id: tmdbId });
  } catch (err) {
    console.error('DELETE /api/watchlist/:tmdb_id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remover filme da watchlist pelo ID do registro (UUID)
router.delete('/item/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const sb = authed(token);
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Usuario nao autenticado' });

    const { error } = await sb
      .from('watchlist')
      .delete()
      .eq('usuario_id', user.id)
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ removido: true, id: req.params.id });
  } catch (err) {
    console.error('DELETE /api/watchlist/item/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
