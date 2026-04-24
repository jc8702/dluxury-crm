-- ════════════════════════════════════════════════════════════════════
-- FASE 5.1: MIGRATION — ÍNDICES, FKs, CONSISTÊNCIA (EXECUTÁVEL)
-- ════════════════════════════════════════════════════════════════════

-- CRÍTICO: Garantir UTC global
SET TIME ZONE 'UTC';

-- ════════════════════════════════════════════════════════════════════
-- FINALIZAR ÍNDICES CRÍTICOS (PERFORMANCE REAL)
-- ════════════════════════════════════════════════════════════════════

-- Eventos
CREATE INDEX IF NOT EXISTS idx_eventos_data_inicio ON eventos (data_inicio);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos (tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_status ON eventos (status);

-- Orçamentos (se existirem)
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente_id ON orcamentos (cliente_id) IF EXISTS;

-- Projetos (se existirem)
CREATE INDEX IF NOT EXISTS idx_projetos_cliente_id ON projetos (cliente_id) IF EXISTS;

-- ════════════════════════════════════════════════════════════════════
-- PADRONIZAÇÃO DE ENUMS (CRÍTICO) - CORRIGIR DADOS ANTIGOS
-- ════════════════════════════════════════════════════════════════════

-- Normalizar dados existentes para minúsculas
UPDATE eventos SET objetivo = LOWER(TRIM(objetivo)) WHERE objetivo IS NOT NULL;
UPDATE eventos SET tipo = LOWER(TRIM(tipo)) WHERE tipo IS NOT NULL;
UPDATE eventos SET status = LOWER(TRIM(status)) WHERE status IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════
-- TRIGGER DE NORMALIZAÇÃO AUTOMÁTICA
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION normalize_eventos_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.objetivo IS NOT NULL THEN
    NEW.objetivo := LOWER(TRIM(NEW.objetivo));
  END IF;
  IF NEW.tipo IS NOT NULL THEN
    NEW.tipo := LOWER(TRIM(NEW.tipo));
  END IF;
  IF NEW.status IS NOT NULL THEN
    NEW.status := LOWER(TRIM(NEW.status));
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
ALTER TABLE eventos ADD CONSTRAINT IF NOT EXISTS check_datas_validas
CHECK (data_fim IS NULL OR data_fim >= data_inicio);