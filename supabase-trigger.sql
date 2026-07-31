-- ============================================
-- TRIGGER SIMPLIFICADO: Gerenciamento de status
-- ============================================

-- Função para INSERT
CREATE OR REPLACE FUNCTION trg_quinzena_insert()
RETURNS TRIGGER AS $$
DECLARE
  tem_ativa BOOLEAN;
  max_data_fim DATE;
BEGIN
  -- Verifica se já existe EM_CARTAZ ativa
  SELECT EXISTS(
    SELECT 1 FROM quinzenas
    WHERE status = 'EM_CARTAZ'
      AND data_fim >= CURRENT_DATE
  ) INTO tem_ativa;

  IF tem_ativa THEN
    -- Já tem ativa → nova fica AGUARDANDO
    NEW.status := 'AGUARDANDO';
    
    -- Pega a data_fim da quinzena ativa mais recente
    SELECT MAX(data_fim) INTO max_data_fim
    FROM quinzenas
    WHERE status = 'EM_CARTAZ' AND data_fim >= CURRENT_DATE;
    
    -- Define datas baseadas na ativa
    NEW.data_inicio := max_data_fim + INTERVAL '1 day';
    NEW.data_fim := NEW.data_inicio + INTERVAL '15 days';
  ELSE
    -- Não tem ativa → nova entra em cartaz
    NEW.status := 'EM_CARTAZ';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para UPDATE (quando status muda para ENCERRADA)
CREATE OR REPLACE FUNCTION trg_quinzena_update()
RETURNS TRIGGER AS $$
DECLARE
  aguardando_id UUID;
BEGIN
  -- Só executa se status mudou de EM_CARTAZ para ENCERRADA
  IF OLD.status = 'EM_CARTAZ' AND NEW.status = 'ENCERRADA' THEN
    -- Promove a AGUARDANDO mais antiga
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove triggers antigos se existirem
DROP TRIGGER IF EXISTS trg_quinzena_before_insert ON quinzenas;
DROP TRIGGER IF EXISTS trg_quinzena_before_update ON quinzenas;

-- Cria os triggers
CREATE TRIGGER trg_quinzena_before_insert
  BEFORE INSERT ON quinzenas
  FOR EACH ROW
  EXECUTE FUNCTION trg_quinzena_insert();

CREATE TRIGGER trg_quinzena_before_update
  BEFORE UPDATE ON quinzenas
  FOR EACH ROW
  EXECUTE FUNCTION trg_quinzena_update();

-- ============================================
-- CORREÇÃO IMEDIATA DOS DADOS
-- ============================================

-- 1. Fecha quinzenas expiradas
UPDATE quinzenas
SET status = 'ENCERRADA'
WHERE status = 'EM_CARTAZ'
  AND data_fim < CURRENT_DATE;

-- 2. Verifica se precisa promover AGUARDANDO
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

-- 3. Corrige quinzenas AGUARDANDO com datas erradas
UPDATE quinzenas q
SET 
  data_inicio = ativa.data_fim + INTERVAL '1 day',
  data_fim = ativa.data_fim + INTERVAL '16 days'
FROM (
  SELECT MAX(data_fim) as data_fim
  FROM quinzenas
  WHERE status = 'EM_CARTAZ'
) ativa
WHERE q.status = 'AGUARDANDO'
  AND q.data_inicio != ativa.data_fim + INTERVAL '1 day';
