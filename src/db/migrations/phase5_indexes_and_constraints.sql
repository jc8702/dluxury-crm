-- ════════════════════════════════════════════════════════════════════
-- FASE 5.1: MIGRATION — ÍNDICES, FKs, CONSISTÊNCIA (EXECUTÁVEL)
-- ════════════════════════════════════════════════════════════════════

-- CRÍTICO: Garantir UTC global
SET TIME ZONE 'UTC';

-- Limpeza de triggers legados quebrados
DROP TRIGGER IF EXISTS trigger_atualizar_eventos ON eventos;


-- ════════════════════════════════════════════════════════════════════
-- FINALIZAR ÍNDICES CRÍTICOS (PERFORMANCE REAL)
-- ════════════════════════════════════════════════════════════════════

-- Eventos
CREATE INDEX IF NOT EXISTS idx_eventos_data_inicio ON eventos (data_inicio);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos (tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_status_visita ON eventos (status_visita);

-- Orçamentos (se existirem)
DO $$ BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orcamentos') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orcamentos_cliente_id') THEN
      CREATE INDEX idx_orcamentos_cliente_id ON orcamentos (cliente_id);
    END IF;
  END IF;
END $$;

-- Projetos (se existirem)
DO $$ BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projetos') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projetos_cliente_id') THEN
      CREATE INDEX idx_projetos_cliente_id ON projetos (cliente_id);
    END IF;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════
-- PADRONIZAÇÃO DE ENUMS (CRÍTICO) - CORRIGIR DADOS ANTIGOS
-- ════════════════════════════════════════════════════════════════════

-- Normalizar dados existentes para minúsculas
UPDATE eventos SET objetivo = LOWER(TRIM(objetivo::text))::tipo_objetivo WHERE objetivo IS NOT NULL;
UPDATE eventos SET tipo = LOWER(TRIM(tipo)) WHERE tipo IS NOT NULL;
UPDATE eventos SET status_visita = LOWER(TRIM(status_visita)) WHERE status_visita IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════
-- TRIGGER DE NORMALIZAÇÃO AUTOMÁTICA
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION normalize_eventos_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.objetivo IS NOT NULL THEN
    NEW.objetivo := LOWER(TRIM(NEW.objetivo::text))::tipo_objetivo;
  END IF;
  IF NEW.tipo IS NOT NULL THEN
    NEW.tipo := LOWER(TRIM(NEW.tipo));
  END IF;
  IF NEW.status_visita IS NOT NULL THEN
    NEW.status_visita := LOWER(TRIM(NEW.status_visita));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_eventos ON eventos;
CREATE TRIGGER trg_normalize_eventos
BEFORE INSERT OR UPDATE ON eventos
FOR EACH ROW
EXECUTE FUNCTION normalize_eventos_fields();

-- ════════════════════════════════════════════════════════════════════
-- INTEGRIDADE FORTE (ANTI-BUG FUTURO)
-- ════════════════════════════════════════════════════════════════════

-- CHECKS INTELIGENTES
DO $$ BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_datas_validas') THEN
    ALTER TABLE eventos ADD CONSTRAINT check_datas_validas CHECK (data_fim IS NULL OR data_fim >= data_inicio);
  END IF;
END $$;