const { Router } = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = Router();

function userIdFromToken(token) {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  return payload.sub;
}

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const userId = userIdFromToken(token);
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data, error } = await sb
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    if (!data) {
      const { data: { user } } = await sb.auth.getUser(token);
      const email = user?.email || '';
      const { data: novo, error: insertError } = await sb
        .from('usuarios')
        .insert({ id: userId, email })
        .select()
        .maybeSingle();
      if (insertError) return res.status(500).json({ error: insertError.message });
      return res.json(novo);
    }

    res.json(data);
  } catch (err) {
    console.error('GET /me error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

router.put('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const userId = userIdFromToken(token);
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const updates = {};
    if (req.body.nome !== undefined) updates.nome = req.body.nome.trim();
    if (req.body.avatar_url !== undefined) updates.avatar_url = req.body.avatar_url;
    if (req.body.badge_ativa !== undefined) updates.badge_ativa = req.body.badge_ativa ? req.body.badge_ativa.trim() : null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    const { data, error } = await sb
      .from('usuarios')
      .upsert({ id: userId, ...updates })
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('PUT /me error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
