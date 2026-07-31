const { Router } = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = Router();

function authed(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

router.get('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const sb = authed(token);
    const { data: { user } } = await sb.auth.getUser(token);

    const { data: quinzenas, error: errQ } = await sb
      .from('quinzenas')
      .select('id, usuario_id, data_inicio, data_fim, status, filmes(*), avaliacoes(nota)')
      .neq('status', 'AGUARDANDO')
      .order('data_inicio', { ascending: true });

    if (errQ) return res.status(500).json({ error: errQ.message });

    const { data: usuarios, error: errU } = await sb
      .from('usuarios')
      .select('id, nome, email, avatar_url')
      .order('criado_em');

    if (errU) return res.status(500).json({ error: errU.message });

    const ranking = usuarios.map(usuario => {
      const minhasQuinzenas = (quinzenas || []).filter(q => q.usuario_id === usuario.id);

      const todasNotas = [];
      const filmesComMedia = minhasQuinzenas.map(q => {
        const notas = (q.avaliacoes || []).map(a => a.nota);
        todasNotas.push(...notas);
        const media = notas.length ? (notas.reduce((s, n) => s + n, 0) / notas.length) : null;
        return {
          quinzena_id: q.id,
          data_inicio: q.data_inicio,
          data_fim: q.data_fim,
          status: q.status,
          filme: q.filmes,
          media
        };
      });

      const totalFilmes = minhasQuinzenas.length;
      const totalAvaliacoes = todasNotas.length;
      const media = todasNotas.length ? (todasNotas.reduce((s, n) => s + n, 0) / todasNotas.length) : null;

      const comMedia = filmesComMedia.filter(f => f.media !== null);
      const melhorEscolha = comMedia.length ? comMedia.reduce((best, f) => f.media > best.media ? f : best, comMedia[0]) : null;
      const piorEscolha = comMedia.length ? comMedia.reduce((worst, f) => f.media < worst.media ? f : worst, comMedia[0]) : null;

      let trend = null;
      if (comMedia.length >= 2) {
        const sorted = [...comMedia].sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
        const last = sorted[sorted.length - 1].media;
        const prev = sorted[sorted.length - 2].media;
        if (last > prev) trend = 'up';
        else if (last < prev) trend = 'down';
        else trend = 'same';
      }

      return {
        usuario: { id: usuario.id, nome: usuario.nome, avatar_url: usuario.avatar_url },
        media,
        totalFilmes,
        totalAvaliacoes,
        melhorEscolha,
        piorEscolha,
        trend,
        filmes: filmesComMedia
      };
    });

    ranking.sort((a, b) => {
      if (a.media === null && b.media === null) return 0;
      if (a.media === null) return 1;
      if (b.media === null) return -1;
      if (b.media !== a.media) return b.media - a.media;
      return b.totalAvaliacoes - a.totalAvaliacoes;
    });

    ranking.forEach((r, i) => { r.posicao = i + 1; });

    res.json({
      ranking,
      usuarioLogadoId: user?.id || null
    });
  } catch (err) {
    console.error('GET /ranking error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
