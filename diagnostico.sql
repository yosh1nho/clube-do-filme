-- ============================================
-- DIAGNÓSTICO: Verificar estado atual e trigger
-- ============================================

-- 1. Ver todas as quinzenas
SELECT 
  id, 
  usuario_id, 
  filme_id,
  data_inicio, 
  data_fim, 
  status,
  CASE 
    WHEN data_fim >= CURRENT_DATE THEN 'ATIVA'
    ELSE 'EXPIRADA'
  END as situacao
FROM quinzenas 
ORDER BY data_inicio;

-- 2. Verificar se o trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'quinzenas';

-- 3. Verificar se a função existe
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'gerenciar_status_quinzena';

-- 4. Teste: inserir uma quinzena de teste (se não houver EM_CARTAZ ativa)
-- Descomente APENAS se quiser testar:
/*
INSERT INTO quinzenas (usuario_id, filme_id, data_inicio, data_fim, status)
VALUES (
  '44ace5d1-2114-4f05-863a-33c873734d4e',  -- substitua pelo seu usuario_id
  1,  -- substitua pelo filme_id
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '15 days',
  'EM_CARTAZ'
)
RETURNING id, data_inicio, data_fim, status;
*/

-- 5. Verificar quantas EM_CARTAZ ativas existem
SELECT 
  COUNT(*) as total_ativas,
  MIN(data_fim) as primeira_expiracao
FROM quinzenas 
WHERE status = 'EM_CARTAZ' 
  AND data_fim >= CURRENT_DATE;
