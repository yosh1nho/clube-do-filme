-- ============================================
-- CRIAÇÃO DA TABELA WATCHLIST ("Quero Indicar")
-- Lista privada de filmes guardados por cada usuário
-- ============================================

CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  poster_url TEXT,
  ano TEXT,
  sinopse TEXT,
  nota_tmdb NUMERIC,
  generos JSONB,
  nota_pessoal TEXT,
  criado_em TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (usuario_id, tmdb_id)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS: cada usuário só visualiza, insere, atualiza e deleta seus próprios itens salvos
DO $$
BEGIN
  DROP POLICY IF EXISTS "Usuarios podem ver sua propria watchlist" ON watchlist;
  DROP POLICY IF EXISTS "Usuarios podem inserir na sua propria watchlist" ON watchlist;
  DROP POLICY IF EXISTS "Usuarios podem atualizar sua propria watchlist" ON watchlist;
  DROP POLICY IF EXISTS "Usuarios podem deletar da sua propria watchlist" ON watchlist;
END $$;

CREATE POLICY "Usuarios podem ver sua propria watchlist"
  ON watchlist FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios podem inserir na sua propria watchlist"
  ON watchlist FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios podem atualizar sua propria watchlist"
  ON watchlist FOR UPDATE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios podem deletar da sua propria watchlist"
  ON watchlist FOR DELETE
  USING (auth.uid() = usuario_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_watchlist_usuario_id ON watchlist(usuario_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_tmdb_id ON watchlist(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_criado_em ON watchlist(criado_em DESC);
