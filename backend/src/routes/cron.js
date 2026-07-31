const { Router } = require('express');
const supabase = require('../supabase');

const router = Router();

router.get('/fechar-quinzenas', async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const sb = supabase.serviceClient || supabase;

    if (!supabase.serviceClient) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not set; cron using anon client (may fail on RLS)');
    }

    const { data, error } = await sb
      .from('quinzenas')
      .update({ status: 'ENCERRADA' })
      .eq('status', 'EM_CARTAZ')
      .lte('data_fim', hoje)
      .select('id');

    if (error) {
      console.error('Cron fechar-quinzenas error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`Cron: fechadas ${data?.length || 0} quinzena(s)`);
    res.json({ fechadas: data?.length || 0 });
  } catch (err) {
    console.error('Cron error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
