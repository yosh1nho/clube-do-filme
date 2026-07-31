const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./supabase');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/tmdb', require('./routes/tmdb'));
app.use('/api/quinzenas', require('./routes/quinzenas'));
app.use('/api/avaliacoes', require('./routes/avaliacoes'));
app.use('/api/ranking', require('./routes/ranking'));

app.get('/api/check-supabase', async (req, res) => {
  try {
    const { error } = await supabase.from('usuarios').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ connected: true });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

app.use(express.static(path.join(__dirname, '..', '..', 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
});

module.exports = app;
