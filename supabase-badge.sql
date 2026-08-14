-- ============================================
-- ADICIONAR COLUNA BADGE_ATIVA NA TABELA USUARIOS
-- Permite que cada usuário escolha qual conquista/título exibir no perfil, resenhas e chat
-- ============================================

ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS badge_ativa TEXT;
