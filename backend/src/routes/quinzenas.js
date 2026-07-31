const { Router } = require('express');
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../supabase');

const router = Router();

function authed(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

async function apiFetch(path, opts = {}) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${path}`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
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

async function fecharExpiradas() {
  const hoje = new Date().toISOString().split('T')[0];
  try {
    // Primeiro busca as expiradas para saber se há alguma
    const expiradas = await apiFetch(
      `quinzenas?select=id&status=eq.EM_CARTAZ&data_fim=lte.${hoje}`
    );
    
    // Só fecha e promove se realmente há expiradas
    if (Array.isArray(expiradas) && expiradas.length > 0) {
      await apiFetch(`quinzenas?status=eq.EM_CARTAZ&data_fim=lte.${hoje}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: 'ENCERRADA' })
      });
      
      const aguardando = await apiFetch('quinzenas?select=id&status=eq.AGUARDANDO&order=data_inicio.asc&limit=1');
      if (Array.isArray(aguardando) && aguardando.length > 0) {
        await apiFetch(`quinzenas?id=eq.${aguardando[0].id}`, {
          method: 'PATCH',
          headers: { 'Prefer': 'return=minimal' },
          body: JSON.stringify({ status: 'EM_CARTAZ' })
        });
      }
    }
  } catch (err) {
    console.error('fecharExpiradas error:', err.message);
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

    // Busca ou cria filme via client normal (RLS permite)
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

    // Fecha expiradas primeiro
    await fecharExpiradas();

    // Verifica se há quinzena EM_CARTAZ ativa via REST API (service key bypassa RLS)
    const hojeStr = new Date().toISOString().split('T')[0];
    let quinzenaAtiva = null;

    try {
      const ativas = await apiFetch(
        `quinzenas?select=id,data_fim&status=eq.EM_CARTAZ&data_fim=gte.${hojeStr}&order=data_fim.desc&limit=1`
      );
      if (Array.isArray(ativas) && ativas.length > 0) {
        quinzenaAtiva = ativas[0];
      }
    } catch (err) {
      console.error('Erro ao buscar quinzena ativa:', err.message);
    }

    // Define datas e status
    let dataInicio, dataFim, status;

    if (quinzenaAtiva) {
      // Tem quinzena ativa → nova fica AGUARDANDO
      const dataFimAtual = new Date(quinzenaAtiva.data_fim);
      dataInicio = new Date(dataFimAtual);
      dataInicio.setDate(dataInicio.getDate() + 1);
      dataFim = new Date(dataInicio);
      dataFim.setDate(dataFim.getDate() + 15);
      status = 'AGUARDANDO';
    } else {
      // Não tem ativa → entra em cartaz agora
      const hoje = new Date();
      dataInicio = hoje;
      dataFim = new Date(hoje);
      dataFim.setDate(dataFim.getDate() + 15);
      status = 'EM_CARTAZ';
    }

    // Insert via REST API com service key (bypassa RLS e trigger)
    const payload = {
      usuario_id: user.id,
      filme_id: filmeId,
      data_inicio: dataInicio.toISOString().split('T')[0],
      data_fim: dataFim.toISOString().split('T')[0],
      status
    };

    const inserted = await apiFetch('quinzenas?select=*,filmes(*)', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    res.json(inserted);
  } catch (err) {
    console.error('POST /quinzenas error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
