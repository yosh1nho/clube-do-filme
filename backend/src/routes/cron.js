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

    const { data: fechadas, error: errClose } = await sb
      .from('quinzenas')
      .update({ status: 'ENCERRADA' })
      .eq('status', 'EM_CARTAZ')
      .lte('data_fim', hoje)
      .select('id');

    if (errClose) {
      console.error('Cron fechar-quinzenas error:', errClose.message);
      return res.status(500).json({ error: errClose.message });
    }

    const { data: promovida, error: errPromote } = await sb
      .from('quinzenas')
      .select('id')
      .eq('status', 'AGUARDANDO')
      .order('data_inicio', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (errPromote) {
      console.error('Cron promover error:', errPromote.message);
    } else if (promovida) {
      const { error: errUpdate } = await sb
        .from('quinzenas')
        .update({ status: 'EM_CARTAZ' })
        .eq('id', promovida.id);
      if (errUpdate) console.error('Cron promover update error:', errUpdate.message);
    }

    console.log(`Cron: fechadas ${fechadas?.length || 0}, promovida ${promovida ? 'sim' : 'nao'}`);
    res.json({ fechadas: fechadas?.length || 0, promovida: !!promovida });
  } catch (err) {
    console.error('Cron error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
