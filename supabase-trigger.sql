-- ============================================
-- AUTOMAÇÃO DE STATUS DAS QUINZENAS (v2)
-- Fecha EM_CARTAZ expiradas e promove a próxima
-- AGUARDANDO automaticamente.
--
-- Camadas:
--   1. Higienização: remove triggers/funções antigas que quebram
--   2. Função central fechar_quinzenas_expiradas() (idempotente)
--   3. Trigger no INSERT: auto-cura + define status/datas da nova
--   4. Trigger no UPDATE: promove quando encerrar manualmente
--   5. pg_cron: roda todo dia 00:30 (horário de Brasília)
--
-- Como rodar: colar inteiro no Supabase SQL Editor e executar.
-- Pode rodar quantas vezes quiser (idempotente).
-- ============================================

-- 0. Limpeza de versões antigas -----------------------------------------
-- Remove QUALQUER trigger antigo na tabela (evita triggers duplicados
-- e funções legadas como gerenciar_status_quinzena que quebravam o cast)
DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN
    SELECT tgname AS tname
    FROM pg_trigger
    WHERE tgrelid = 'quinzenas'::regclass AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON quinzenas', t.tname);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS gerenciar_status_quinzena() CASCADE;
DROP FUNCTION IF EXISTS trg_status_quinzena() CASCADE;
DROP FUNCTION IF EXISTS atualizar_status_quinzena() CASCADE;

-- 1. Função central -------------------------------------------------------
CREATE OR REPLACE FUNCTION fechar_quinzenas_expiradas()
RETURNS INTEGER AS $$
DECLARE
  hoje DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;
  fechadas INTEGER;
  aguardando_id quinzenas.id%TYPE;
BEGIN
  -- 1.1 Fecha EM_CARTAZ cuja data_fim já passou (último dia incluso)
  UPDATE quinzenas
  SET status = 'ENCERRADA'
  WHERE status = 'EM_CARTAZ'
    AND data_fim < hoje;
  GET DIAGNOSTICS fechadas = ROW_COUNT;

  -- 1.2 Promove a AGUARDANDO mais antiga (já dentro do período) se não há ativa
  IF NOT EXISTS (
    SELECT 1 FROM quinzenas
    WHERE status = 'EM_CARTAZ' AND data_fim >= hoje
  ) THEN
    SELECT id INTO aguardando_id
    FROM quinzenas
    WHERE status = 'AGUARDANDO'
      AND data_inicio <= hoje
    ORDER BY data_inicio ASC
    LIMIT 1;

    IF aguardando_id IS NOT NULL THEN
      UPDATE quinzenas
      SET status = 'EM_CARTAZ'
      WHERE id = aguardando_id;
    END IF;
  END IF;

  RETURN fechadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger INSERT ------------------------------------------------------
-- Auto-cura ao inserir e decide status/datas da nova quinzena
CREATE OR REPLACE FUNCTION trg_quinzena_insert()
RETURNS TRIGGER AS $$
DECLARE
  hoje DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;
  tem_ativa BOOLEAN;
  max_data_fim DATE;
BEGIN
  -- Fecha expiradas e promove a próxima antes de decidir a nova
  PERFORM fechar_quinzenas_expiradas();

  SELECT EXISTS(
    SELECT 1 FROM quinzenas
    WHERE status = 'EM_CARTAZ' AND data_fim >= hoje
  ) INTO tem_ativa;

  IF tem_ativa THEN
    -- Já tem ativa → nova fica AGUARDANDO na sequência da ativa
    NEW.status := 'AGUARDANDO';

    SELECT MAX(data_fim) INTO max_data_fim
    FROM quinzenas
    WHERE status = 'EM_CARTAZ' AND data_fim >= hoje;

    NEW.data_inicio := max_data_fim + INTERVAL '1 day';
    NEW.data_fim := NEW.data_inicio + INTERVAL '15 days';
  ELSE
    -- Não tem ativa → nova entra em cartaz agora
    NEW.status := 'EM_CARTAZ';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger UPDATE ------------------------------------------------------
-- Quando alguém encerra manualmente, promove a próxima (inline, sem recursion)
CREATE OR REPLACE FUNCTION trg_quinzena_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'EM_CARTAZ' AND NEW.status = 'ENCERRADA' THEN
    UPDATE quinzenas
    SET status = 'EM_CARTAZ'
    WHERE id = (
      SELECT id FROM quinzenas
      WHERE status = 'AGUARDANDO'
        AND data_inicio <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date
      ORDER BY data_inicio ASC
      LIMIT 1
    )
    AND NOT EXISTS (
      SELECT 1 FROM quinzenas
      WHERE status = 'EM_CARTAZ'
        AND data_fim >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recria os triggers (a limpeza no passo 0 removeu os antigos) ---------
CREATE TRIGGER trg_quinzena_before_insert
  BEFORE INSERT ON quinzenas
  FOR EACH ROW
  EXECUTE FUNCTION trg_quinzena_insert();

CREATE TRIGGER trg_quinzena_before_update
  BEFORE UPDATE ON quinzenas
  FOR EACH ROW
  EXECUTE FUNCTION trg_quinzena_update();

-- 5. Agendamento diário via pg_cron --------------------------------------
-- 03:30 UTC = 00:30 horário de Brasília
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE j RECORD;
BEGIN
  FOR j IN SELECT jobid FROM cron.job WHERE jobname = 'fechar-quinzenas-diario' LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'fechar-quinzenas-diario',
  '30 3 * * *',
  'SELECT fechar_quinzenas_expiradas();'
);

-- 6. Correção imediata dos dados atuais -----------------------------------
SELECT fechar_quinzenas_expiradas() AS quinzenas_fechadas;

-- 7. Conferência -----------------------------------------------------------
SELECT id, data_inicio, data_fim, status
FROM quinzenas
ORDER BY data_inicio;