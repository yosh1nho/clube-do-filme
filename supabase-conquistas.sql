-- ============================================
-- TABELA DE CONQUISTAS E BADGES DOS USUÁRIOS
-- Registra o inventário e histórico de troféus de cada membro
-- ============================================

CREATE TABLE IF NOT EXISTS usuario_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo_icone TEXT NOT NULL,
  categoria TEXT,
  destaque TEXT,
  conquistado_em TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  ativa BOOLEAN DEFAULT true NOT NULL,
  UNIQUE(usuario_id, badge_id)
);

-- Habilitar RLS
ALTER TABLE usuario_badges ENABLE ROW LEVEL SECURITY;

-- Política de Leitura: qualquer membro autenticado pode ver as conquistas do clube
DROP POLICY IF EXISTS "Leitura de conquistas para autenticados" ON usuario_badges;
CREATE POLICY "Leitura de conquistas para autenticados"
ON usuario_badges FOR SELECT
TO authenticated
USING (true);

-- Política de Inserção e Atualização para membros autenticados
DROP POLICY IF EXISTS "Gerenciamento de conquistas para autenticados" ON usuario_badges;
CREATE POLICY "Gerenciamento de conquistas para autenticados"
ON usuario_badges FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Coluna para indicar a badge/título equipada no momento
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS badge_ativa TEXT;
