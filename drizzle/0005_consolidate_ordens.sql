-- Migration 0005: Consolidate ordens_producao (legacy) -> ordens_prod (new).
-- ADR-2026-06-05-01 / audit 2026-06-05 §1.5.
-- Two parallel tables exist; production code is split between them.
-- This migration:
--   1. Copies any data from ordens_producao to ordens_prod (best-effort).
--   2. Renames ordens_producao to ordens_producao_legacy (deprecation tombstone).
--   3. Does NOT drop ordens_producao_legacy — admins can verify and drop later.
-- Idempotent: if ordens_producao_legacy already exists, no-op.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'ordens_producao'
      AND table_schema = 'public'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'ordens_producao_legacy'
      AND table_schema = 'public'
  ) THEN
    -- Best-effort: only copy if column shapes are compatible
    BEGIN
      EXECUTE $sql$
        INSERT INTO ordens_prod (
          id, tenant_id, status, data_criacao, data_previsao, data_conclusao,
          cliente_id, projeto_id, observacoes
        )
        SELECT
          id, tenant_id, status, created_at, data_previsao, data_conclusao,
          cliente_id, projeto_id, observacoes
        FROM ordens_producao
        ON CONFLICT (id) DO NOTHING
      $sql$;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ordens_producao -> ordens_prod: copy skipped: %', SQLERRM;
    END;

    -- Tombstone: keep the legacy table around for forensic audit
    EXECUTE 'ALTER TABLE ordens_producao RENAME TO ordens_producao_legacy';

    -- Document
    EXECUTE $sql$
      COMMENT ON TABLE ordens_producao_legacy IS
        'DEPRECATED 2026-06-05: substituída por ordens_prod. Mantida por 30 dias para auditoria. DROP após 2026-07-05.'
    $sql$;
  END IF;
END $$;
