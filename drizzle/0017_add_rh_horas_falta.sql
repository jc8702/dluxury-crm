-- Migration 0017: Horas de falta automáticas por dia (RH)
-- Calcula falta parcial a partir de hora_saida / hora_retorno (ex: 13:00 → 14:34 = 94min = 1h34)
-- Integrado ao fechamento da folha via calculo (minutos/60 * valorHora)

DO $$
BEGIN
  -- presencas.hora_saida
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presencas' AND column_name = 'hora_saida'
  ) THEN
    ALTER TABLE presencas ADD COLUMN hora_saida VARCHAR(5);
  END IF;

  -- presencas.hora_retorno
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presencas' AND column_name = 'hora_retorno'
  ) THEN
    ALTER TABLE presencas ADD COLUMN hora_retorno VARCHAR(5);
  END IF;

  -- presencas.horas_falta_minutos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presencas' AND column_name = 'horas_falta_minutos'
  ) THEN
    ALTER TABLE presencas ADD COLUMN horas_falta_minutos INTEGER DEFAULT 0;
  END IF;

  -- folha_itens.horas_falta_minutos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'folha_itens' AND column_name = 'horas_falta_minutos'
  ) THEN
    ALTER TABLE folha_itens ADD COLUMN horas_falta_minutos INTEGER DEFAULT 0;
  END IF;

  -- folha_itens.valor_falta_horas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'folha_itens' AND column_name = 'valor_falta_horas'
  ) THEN
    ALTER TABLE folha_itens ADD COLUMN valor_falta_horas NUMERIC(12,2) DEFAULT '0';
  END IF;

  -- Backfill presencas.horas_falta_minutos quando ambos horarios preenchidos mas minutos = 0/NULL
  -- Usa parsing HH:MM → minutos; cruza meia-noite somando 1440
  UPDATE presencas
  SET horas_falta_minutos = (
    CASE
      WHEN hora_saida ~ '^\d{1,2}:\d{2}$' AND hora_retorno ~ '^\d{1,2}:\d{2}$' THEN
        (
          (EXTRACT(HOUR FROM hora_retorno::time) * 60 + EXTRACT(MINUTE FROM hora_retorno::time))
          - (EXTRACT(HOUR FROM hora_saida::time) * 60 + EXTRACT(MINUTE FROM hora_saida::time))
          + CASE WHEN hora_retorno::time < hora_saida::time THEN 1440 ELSE 0 END
        )::int
      ELSE 0
    END
  )
  WHERE (horas_falta_minutos IS NULL OR horas_falta_minutos = 0)
    AND hora_saida IS NOT NULL AND hora_retorno IS NOT NULL;

  -- Índice para agregação mensal por colaborador
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_presencas_horas_falta') THEN
    CREATE INDEX idx_presencas_horas_falta ON presencas (tenant_id, colaborador_id, data) WHERE horas_falta_minutos > 0;
  END IF;

  -- Corrige header 0016 que estava como 0009
  -- (sem ação DDL, apenas documentação)
END $$;
