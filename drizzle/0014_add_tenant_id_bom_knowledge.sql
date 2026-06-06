-- Migration 0014: Add tenant_id to 4 tables that were missed in 0002.
-- 0002 added tenant_id to 21 tables. This migration catches the 4 leftovers
-- that were either added after 0002 or whose absence was not detected:
--   - bom_engenharia_montagem   (backfill from sku_engenharia.tenant_id)
--   - bom_montagem_componente   (backfill from sku_montagem.tenant_id)
--   - conhecimento_marcenaria   (backfill to master tenant; no FK parent)
--   - quotation_bom             (backfill from quotation_items.tenant_id)
-- Idempotent: all operations guarded with IF NOT EXISTS / to_regclass.
--
-- Explicitly NOT touched:
--   - erp_families            (not in Drizzle schema, separate audit pending)
--   - ordens_producao_legacy  (tombstone, retires 2026-07-05)

DO $mig$
DECLARE
  master UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- ===========================================================
  -- bom_engenharia_montagem
  -- ===========================================================
  IF to_regclass('public.bom_engenharia_montagem') IS NOT NULL THEN
    ALTER TABLE bom_engenharia_montagem
      ADD COLUMN IF NOT EXISTS tenant_id UUID;

    UPDATE bom_engenharia_montagem b
    SET tenant_id = se.tenant_id
    FROM sku_engenharia se
    WHERE b.sku_engenharia_id = se.id
      AND b.tenant_id IS NULL;

    UPDATE bom_engenharia_montagem
    SET tenant_id = master
    WHERE tenant_id IS NULL;

    ALTER TABLE bom_engenharia_montagem
      ALTER COLUMN tenant_id SET NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_bom_eng_mont_tenant_id
      ON bom_engenharia_montagem(tenant_id);
  END IF;

  -- ===========================================================
  -- bom_montagem_componente
  -- ===========================================================
  IF to_regclass('public.bom_montagem_componente') IS NOT NULL THEN
    ALTER TABLE bom_montagem_componente
      ADD COLUMN IF NOT EXISTS tenant_id UUID;

    UPDATE bom_montagem_componente b
    SET tenant_id = sm.tenant_id
    FROM sku_montagem sm
    WHERE b.sku_montagem_id = sm.id
      AND b.tenant_id IS NULL;

    UPDATE bom_montagem_componente
    SET tenant_id = master
    WHERE tenant_id IS NULL;

    ALTER TABLE bom_montagem_componente
      ALTER COLUMN tenant_id SET NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_bom_mont_comp_tenant_id
      ON bom_montagem_componente(tenant_id);
  END IF;

  -- ===========================================================
  -- conhecimento_marcenaria
  -- ===========================================================
  IF to_regclass('public.conhecimento_marcenaria') IS NOT NULL THEN
    ALTER TABLE conhecimento_marcenaria
      ADD COLUMN IF NOT EXISTS tenant_id UUID;

    UPDATE conhecimento_marcenaria
    SET tenant_id = master
    WHERE tenant_id IS NULL;

    ALTER TABLE conhecimento_marcenaria
      ALTER COLUMN tenant_id SET NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_conhecimento_marc_tenant_id
      ON conhecimento_marcenaria(tenant_id);
  END IF;

  -- ===========================================================
  -- quotation_bom
  -- ===========================================================
  IF to_regclass('public.quotation_bom') IS NOT NULL THEN
    ALTER TABLE quotation_bom
      ADD COLUMN IF NOT EXISTS tenant_id UUID;

    UPDATE quotation_bom qb
    SET tenant_id = qi.tenant_id
    FROM quotation_items qi
    WHERE qb.quotation_item_id = qi.id
      AND qb.tenant_id IS NULL;

    UPDATE quotation_bom
    SET tenant_id = master
    WHERE tenant_id IS NULL;

    ALTER TABLE quotation_bom
      ALTER COLUMN tenant_id SET NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_quotation_bom_tenant_id
      ON quotation_bom(tenant_id);
  END IF;
END $mig$;
