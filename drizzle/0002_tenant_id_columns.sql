-- Migration 0002: Add tenant_id to tables that lack it.
-- ADR-2026-06-05-01 §D4 — backfill master tenant for legacy data.
-- Idempotent: safe to re-run.

-- =====================================================================
-- Fase 1.A: Tabelas financeiras (CRÍTICO LGPD)
-- =====================================================================

ALTER TABLE titulos_receber       ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE titulos_pagar         ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE baixas                ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE contas_internas       ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE contas_recorrentes    ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE classes_financeiras   ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE condicoes_pagamento   ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE formas_pagamento      ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- =====================================================================
-- Fase 1.B: Auditoria / logs
-- =====================================================================

ALTER TABLE audit_logs            ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE system_logs           ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- =====================================================================
-- Fase 1.C: Agenda / histórico
-- =====================================================================

ALTER TABLE eventos_historico     ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE eventos_agenda        ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE tipos_evento_config   ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- =====================================================================
-- Fase 1.D: Configuração / catálogo
-- =====================================================================

ALTER TABLE categorias_material       ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE configuracoes_precificacao ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE projeto_tipos             ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE projeto_parametros        ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE retalhos_estoque          ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE historico_chamado         ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE counters                  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- =====================================================================
-- Backfill seguro: dados legados vão para o master tenant
-- =====================================================================

DO $$
DECLARE
  master UUID := '00000000-0000-0000-0000-000000000000';
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT unnest(ARRAY[
      'titulos_receber','titulos_pagar','baixas','contas_internas',
      'contas_recorrentes','classes_financeiras','condicoes_pagamento',
      'formas_pagamento','audit_logs','system_logs','eventos_historico',
      'eventos_agenda','tipos_evento_config','categorias_material',
      'configuracoes_precificacao','projeto_tipos','projeto_parametros',
      'retalhos_estoque','historico_chamado','counters'
    ]) AS tbl
  LOOP
    EXECUTE format(
      'UPDATE %I SET tenant_id = $1 WHERE tenant_id IS NULL', rec.tbl
    ) USING master;
  END LOOP;
END $$;

-- =====================================================================
-- Índices por tenant_id (após backfill, antes do NOT NULL)
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_titulos_receber_tenant_id       ON titulos_receber(tenant_id);
CREATE INDEX IF NOT EXISTS idx_titulos_pagar_tenant_id         ON titulos_pagar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_baixas_tenant_id                ON baixas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contas_internas_tenant_id       ON contas_internas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contas_recorrentes_tenant_id    ON contas_recorrentes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classes_financeiras_tenant_id   ON classes_financeiras(tenant_id);
CREATE INDEX IF NOT EXISTS idx_condicoes_pagamento_tenant_id   ON condicoes_pagamento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_tenant_id      ON formas_pagamento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id            ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eventos_historico_tenant_id     ON eventos_historico(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_tenant_id        ON eventos_agenda(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categorias_material_tenant_id   ON categorias_material(tenant_id);
CREATE INDEX IF NOT EXISTS idx_configuracoes_prec_tenant_id    ON configuracoes_precificacao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projeto_tipos_tenant_id         ON projeto_tipos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projeto_parametros_tenant_id    ON projeto_parametros(tenant_id);
CREATE INDEX IF NOT EXISTS idx_retalhos_estoque_tenant_id      ON retalhos_estoque(tenant_id);
CREATE INDEX IF NOT EXISTS idx_historico_chamado_tenant_id     ON historico_chamado(tenant_id);
CREATE INDEX IF NOT EXISTS idx_counters_tenant_id              ON counters(tenant_id);

-- =====================================================================
-- NOT NULL onde é mandatório (todas exceto tabelas de log e config global)
-- =====================================================================
--
-- Audit logs e system logs aceitam NULL (podem ser eventos de sistema sem tenant).
-- O restante é obrigatório.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT unnest(ARRAY[
      'titulos_receber','titulos_pagar','baixas','contas_internas',
      'contas_recorrentes','classes_financeiras','condicoes_pagamento',
      'formas_pagamento','eventos_historico','eventos_agenda',
      'tipos_evento_config','categorias_material',
      'configuracoes_precificacao','projeto_tipos','projeto_parametros',
      'retalhos_estoque','historico_chamado','counters'
    ]) AS tbl
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', rec.tbl
    );
  END LOOP;
END $$;
