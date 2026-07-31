const { Router } = require('express');
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../supabase');

const router = Router();

function authed(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

async function fecharExpiradas(sb) {
  const hoje = new Date().toISOString().split('T')[0];
  const client = sb.serviceClient || sb;
  const { error } = await client
    .from('quinzenas')
    .update({ status: 'ENCERRADA' })
    .eq('status', 'EM_CARTAZ')
    .lte('data_fim', hoje);
  if (error) console.error('fecharExpiradas error:', error.message);
}

function proximoNaRotacao(usuarios, ultimoEscolhedorId) {
  const idx = usuarios.findIndex(u => u.id === ultimoEscolhedorId);
  if (idx === -1 || idx === usuarios.length - 1) return usuarios[0];
  return usuarios[idx + 1];
}

router.get('/atual', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const sb = authed(token);
    const usuarioLogado = (await sb.auth.getUser(token)).data.user;

    const { data: usuarios, error: errU } = await sb
      .from('usuarios')
      .select('id, nome, email, avatar_url')
      .order('criado_em');

    if (errU) return res.status(500).json({ error: errU.message });

    const { data: ultima, error: errL } = await sb
      .from('quinzenas')
      .select('*, filmes(*)')
      .order('data_fim', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errL) return res.status(500).json({ error: errL.message });

    if (ultima && ultima.status === 'EM_CARTAZ') {
      const hoje = new Date().toISOString().split('T')[0];
      const expirou = ultima.data_fim && ultima.data_fim <= hoje;

      if (expirou) {
        await fecharExpiradas(supabase);
      } else {
        const { data: avaliacoes } = await sb
          .from('avaliacoes')
          .select('*, usuarios(nome, avatar_url), reacoes(*)')
          .eq('quinzena_id', ultima.id);

        const dataFim = new Date(ultima.data_fim);
        const hojeDate = new Date(hoje);
        const diasRestantes = Math.ceil((dataFim - hojeDate) / (1000 * 60 * 60 * 24));

        const proximo = proximoNaRotacao(usuarios, ultima.usuario_id);
        const proximoEscolhendo = diasRestantes <= 4 && proximo.id === usuarioLogado.id;

        if (proximoEscolhendo) {
          return res.json({
            estado: 'escolhendo',
            quinzenaAtual: { ...ultima, avaliacoes: avaliacoes || [], diasRestantes },
            proximoEscolhedor: proximo,
            usuarios
          });
        }

        return res.json({
          estado: 'em_cartaz',
          quinzena: { ...ultima, avaliacoes: avaliacoes || [] },
          diasRestantes,
          usuarios
        });
      }
    }

    const proximo = ultima
      ? proximoNaRotacao(usuarios, ultima.usuario_id)
      : usuarios[0];

    const escolhendoAgora = proximo.id === usuarioLogado.id;

    res.json({
      estado: escolhendoAgora ? 'escolhendo' : 'aguardando',
      proximoEscolhedor: proximo,
      ultimaQuinzena: ultima || null,
      usuarios
    });
  } catch (err) {
    console.error('GET /atual error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const sb = authed(token);
    const { data, error } = await sb
      .from('quinzenas')
      .select('*, filmes(*), usuarios(nome, avatar_url)')
      .order('data_inicio', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const sb = authed(token);
    const { data: { user } } = await sb.auth.getUser(token);

    const { tmdb_id, titulo, poster_url, ano, sinopse } = req.body;
    if (!tmdb_id || !titulo) {
      return res.status(400).json({ error: 'tmdb_id e titulo obrigatorios' });
    }

    const { data: filmeExistente } = await sb
      .from('filmes')
      .select('*')
      .eq('tmdb_id', tmdb_id)
      .maybeSingle();

    let filmeId;
    if (filmeExistente) {
      filmeId = filmeExistente.id;
    } else {
      const { data: novoFilme, error: errF } = await sb
        .from('filmes')
        .insert({ tmdb_id, titulo, poster_url, ano_lancamento: ano })
        .select()
        .single();
      if (errF) return res.status(500).json({ error: errF.message });
      filmeId = novoFilme.id;
    }

    const hoje = new Date();
    const dataFim = new Date(hoje);
    dataFim.setDate(dataFim.getDate() + 15);

    await fecharExpiradas(supabase);

    const { data: quinzena, error: errQ } = await sb
      .from('quinzenas')
      .insert({
        usuario_id: user.id,
        filme_id: filmeId,
        data_inicio: hoje.toISOString().split('T')[0],
        data_fim: dataFim.toISOString().split('T')[0],
        status: 'EM_CARTAZ'
      })
      .select('*, filmes(*)')
      .single();

    if (errQ) return res.status(500).json({ error: errQ.message });
    res.json(quinzena);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
