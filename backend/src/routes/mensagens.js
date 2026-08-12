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
      .from('chat_mensagens')
      .select('*, usuarios(nome, avatar_url)')
      .eq('quinzena_id', req.params.quinzena_id)
      .order('criado_em', { ascending: true });

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

    const { quinzena_id, conteudo } = req.body;
    if (!quinzena_id) {
      return res.status(400).json({ error: 'quinzena_id obrigatorio' });
    }
    if (!conteudo || typeof conteudo !== 'string' || !conteudo.trim()) {
      return res.status(400).json({ error: 'Conteudo obrigatorio' });
    }

    const { data, error } = await sb
      .from('chat_mensagens')
      .insert({
        quinzena_id,
        usuario_id: user.id,
        conteudo: conteudo.trim()
      })
      .select('*, usuarios(nome, avatar_url)')
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
