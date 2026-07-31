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
  const { data, error } = await client
    .from('quinzenas')
    .update({ status: 'ENCERRADA' })
    .eq('status', 'EM_CARTAZ')
    .lte('data_fim', hoje)
    .select('id, data_fim');
  if (error) console.error('fecharExpiradas error:', error.message);
  else if (data?.length) console.log('[fecharExpiradas] fechadas:', data.map(d => d.id));

  await promoverProxima(client);
}

async function promoverProxima(client) {
  const { data, error } = await client
    .from('quinzenas')
    .select('id')
    .eq('status', 'AGUARDANDO')
    .order('data_inicio', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('promoverProxima error:', error.message);
    return;
  }

  if (data) {
    const { error: errUpdate } = await client
      .from('quinzenas')
      .update({ status: 'EM_CARTAZ' })
      .eq('id', data.id);
    if (errUpdate) console.error('promoverProxima update error:', errUpdate.message);
  }
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

    await fecharExpiradas(supabase);

    const { data: quinzenaAtual, error: errQ } = await sb
      .from('quinzenas')
      .select('*, filmes(*)')
      .eq('status', 'EM_CARTAZ')
      .order('data_fim', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errQ) return res.status(500).json({ error: errQ.message });

    if (quinzenaAtual) {
      const hoje = new Date().toISOString().split('T')[0];
      const { data: avaliacoes } = await sb
        .from('avaliacoes')
        .select('*, usuarios(nome, avatar_url), reacoes(*)')
        .eq('quinzena_id', quinzenaAtual.id);

      const dataFim = new Date(quinzenaAtual.data_fim);
      const hojeDate = new Date(hoje);
      const diasRestantes = Math.ceil((dataFim - hojeDate) / (1000 * 60 * 60 * 24));

      const proximo = proximoNaRotacao(usuarios, quinzenaAtual.usuario_id);
      const proximoEscolhendo = diasRestantes <= 4 && proximo.id === usuarioLogado.id;

      if (proximoEscolhendo) {
        return res.json({
          estado: 'escolhendo',
          quinzenaAtual: { ...quinzenaAtual, avaliacoes: avaliacoes || [], diasRestantes },
          proximoEscolhedor: proximo,
          usuarios
        });
      }

      return res.json({
        estado: 'em_cartaz',
        quinzena: { ...quinzenaAtual, avaliacoes: avaliacoes || [] },
        diasRestantes,
        usuarios
      });
    }

    const { data: ultimaQuinzena } = await sb
      .from('quinzenas')
      .select('*, filmes(*)')
      .order('data_fim', { ascending: false })
      .limit(1)
      .maybeSingle();

    const proximo = ultimaQuinzena
      ? proximoNaRotacao(usuarios, ultimaQuinzena.usuario_id)
      : usuarios[0];

    const escolhendoAgora = proximo.id === usuarioLogado.id;

    res.json({
      estado: escolhendoAgora ? 'escolhendo' : 'aguardando',
      proximoEscolhedor: proximo,
      ultimaQuinzena: ultimaQuinzena || null,
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
    const hojeStr = hoje.toISOString().split('T')[0];

    await fecharExpiradas(supabase);

    const { data: quinzenaAtual } = await sb
      .from('quinzenas')
      .select('data_fim')
      .eq('status', 'EM_CARTAZ')
      .order('data_fim', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('[POST] quinzenaAtual encontrada:', quinzenaAtual);

    let dataInicio, dataFim, status;

    if (quinzenaAtual) {
      const dataFimAtual = new Date(quinzenaAtual.data_fim);
      dataInicio = new Date(dataFimAtual);
      dataInicio.setDate(dataInicio.getDate() + 1);
      dataFim = new Date(dataInicio);
      dataFim.setDate(dataFim.getDate() + 15);
      status = 'AGUARDANDO';
    } else {
      dataInicio = hoje;
      dataFim = new Date(hoje);
      dataFim.setDate(dataFim.getDate() + 15);
      status = 'EM_CARTAZ';
    }

    console.log('[POST] nova quinzena:', { data_inicio: dataInicio.toISOString().split('T')[0], data_fim: dataFim.toISOString().split('T')[0], status });

    const { data: quinzena, error: errQ } = await sb
      .from('quinzenas')
      .insert({
        usuario_id: user.id,
        filme_id: filmeId,
        data_inicio: dataInicio.toISOString().split('T')[0],
        data_fim: dataFim.toISOString().split('T')[0],
        status
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
