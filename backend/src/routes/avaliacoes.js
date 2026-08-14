const { Router } = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = Router();

function authed(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

router.get('/:quinzena_id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const sb = authed(token);
    const { data, error } = await sb
      .from('avaliacoes')
      .select('*, usuarios(nome, avatar_url, badge_ativa), reacoes(*, usuarios(nome))')
      .eq('quinzena_id', req.params.quinzena_id);

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

    const { quinzena_id, nota, comentario, spoiler } = req.body;
    if (!quinzena_id || nota === undefined) {
      return res.status(400).json({ error: 'quinzena_id e nota obrigatorios' });
    }
    if (typeof nota !== 'number' || isNaN(nota) || nota < 0 || nota > 5) {
      return res.status(400).json({ error: 'Nota invalida (0 a 5)' });
    }

    const { data, error } = await sb
      .from('avaliacoes')
      .upsert({
        quinzena_id,
        usuario_id: user.id,
        nota,
        comentario: comentario || null,
        spoiler: spoiler || false
      })
      .select('*, usuarios(nome, avatar_url, badge_ativa)')
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const sb = authed(token);
    const { data: { user } } = await sb.auth.getUser(token);

    const updates = {};
    if (req.body.nota !== undefined) {
      const nota = req.body.nota;
      if (typeof nota !== 'number' || isNaN(nota) || nota < 0 || nota > 5) {
        return res.status(400).json({ error: 'Nota invalida (0 a 5)' });
      }
      updates.nota = nota;
    }
    if (req.body.comentario !== undefined) updates.comentario = req.body.comentario;
    if (req.body.spoiler !== undefined) updates.spoiler = req.body.spoiler;

    const { data, error } = await sb
      .from('avaliacoes')
      .update(updates)
      .eq('id', req.params.id)
      .eq('usuario_id', user.id)
      .select('*, usuarios(nome, avatar_url, badge_ativa)')
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reacoes', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const sb = authed(token);
    const { data: { user } } = await sb.auth.getUser(token);

    const { avaliacao_id, emoji } = req.body;
    if (!avaliacao_id || !emoji) {
      return res.status(400).json({ error: 'avaliacao_id e emoji obrigatorios' });
    }

    const { data: existente } = await sb
      .from('reacoes')
      .select('*')
      .eq('avaliacao_id', avaliacao_id)
      .eq('usuario_id', user.id)
      .maybeSingle();

    if (existente) {
      if (existente.emoji === emoji) {
        await sb.from('reacoes').delete().eq('id', existente.id);
        return res.json({ removido: true });
      }
      await sb.from('reacoes').delete().eq('id', existente.id);
    }

    const { data, error } = await sb
      .from('reacoes')
      .insert({
        avaliacao_id,
        usuario_id: user.id,
        emoji
      })
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
