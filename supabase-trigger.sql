-- ============================================
-- TRIGGER: Gerenciamento automático de status das quinzenas
-- ============================================
-- 1. Quando uma nova quinzena é criada:
--    - Se já existe EM_CARTAZ ativa (data_fim >= hoje) → nova fica AGUARDANDO
--    - Senão → nova fica EM_CARTAZ
--
-- 2. Quando uma quinzena é fechada (status → ENCERRADA):
--    - Promove a AGUARDANDO mais antiga para EM_CARTAZ
-- ============================================

CREATE OR REPLACE FUNCTION gerenciar_status_quinzena()
RETURNS TRIGGER AS $$
DECLARE
  hoje DATE := CURRENT_DATE;
  tem_ativa BOOLEAN;
  antiga_aguardando UUID;
BEGIN
  -- Caso 1: INSERT de nova quinzena
  IF TG_OP = 'INSERT' THEN
    -- Verifica se já existe EM_CARTAZ ativa (data_fim >= hoje)
    SELECT EXISTS(
      SELECT 1 FROM quinzenas
      WHERE status = 'EM_CARTAZ'
        AND data_fim >= hoje
        AND id != NEW.id
    ) INTO tem_ativa;

    IF tem_ativa THEN
      -- Já tem quinzena ativa → nova fica AGUARDANDO
      NEW.status := 'AGUARDANDO';
      -- Define data_inicio para começar quando a ativa terminar
      SELECT (MAX(data_fim) + INTERVAL '1 day')::DATE
      INTO NEW.data_inicio
      FROM quinzenas
      WHERE status = 'EM_CARTAZ' AND data_fim >= hoje;

      NEW.data_fim := NEW.data_inicio + INTERVAL '15 days';
    ELSE
      -- Não tem ativa → nova entra em cartaz
      NEW.status := 'EM_CARTAZ';
    END IF;

    RETURN NEW;
  END IF;

  -- Caso 2: UPDATE de status (quando fecha uma quinzena)
  IF TG_OP = 'UPDATE' AND OLD.status = 'EM_CARTAZ' AND NEW.status = 'ENCERRADA' THEN
    -- Promove a AGUARDANDO mais antiga para EM_CARTAZ
    SELECT id INTO antiga_aguardando
    FROM quinzenas
    WHERE status = 'AGUARDANDO'
    ORDER BY data_inicio ASC
    LIMIT 1;

    IF antiga_aguardando IS NOT NULL THEN
      UPDATE quinzenas
      SET status = 'EM_CARTAZ'
      WHERE id = antiga_aguardando;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cria o trigger
DROP TRIGGER IF EXISTS trg_gerenciar_status_quinzena ON quinzenas;
CREATE TRIGGER trg_gerenciar_status_quinzena
  BEFORE INSERT OR UPDATE ON quinzenas
  FOR EACH ROW
  EXECUTE FUNCTION gerenciar_status_quinzena();

-- ============================================
-- CORREÇÃO: Atualiza dados existentes
-- ============================================
-- Fecha quinzenas expiradas
UPDATE quinzenas
SET status = 'ENCERRADA'
WHERE status = 'EM_CARTAZ'
  AND data_fim < CURRENT_DATE;

-- Promove AGUARDANDO se houver
DO $$
DECLARE
  ativa_count INTEGER;
  aguardando_id UUID;
BEGIN
  SELECT COUNT(*) INTO ativa_count
  FROM quinzenas
  WHERE status = 'EM_CARTAZ';

  IF ativa_count = 0 THEN
    SELECT id INTO aguardando_id
    FROM quinzenas
    WHERE status = 'AGUARDANDO'
    ORDER BY data_inicio ASC
    LIMIT 1;

    IF aguardando_id IS NOT NULL THEN
      UPDATE quinzenas
      SET status = 'EM_CARTAZ'
      WHERE id = aguardando_id;
    END IF;
  END IF;
END $$;
