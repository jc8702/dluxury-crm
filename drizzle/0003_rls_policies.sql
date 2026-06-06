-- Migration 0003: Row-Level Security on critical tables.
-- ADR-2026-06-05-01 §D2 — defense in depth.
-- Even if the application has a bug, the DB refuses cross-tenant reads/writes.
--
-- The application must call `SET LOCAL app.tenant_id = '<uuid>'` inside
-- a transaction before any query. The withTenantSql() helper does this
-- automatically.
--
-- Idempotent: safe to re-run.

-- =====================================================================
-- Tabelas protegidas com RLS
-- =====================================================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'titulos_receber',
    'titulos_pagar',
    'baixas',
    'quotations',
    'quotation_items',
    'ordens_prod',
    'materiais'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Ativar RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- Remover policies antigas se existirem (idempotência)
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);

    -- Policy: a row só é visível se tenant_id bate com a session var
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      'USING (tenant_id::text = current_setting(''app.tenant_id'', true)) '
      'WITH CHECK (tenant_id::text = current_setting(''app.tenant_id'', true))',
      tbl
    );
  END LOOP;
END $$;

-- =====================================================================
-- Grant explícito: o role da aplicação precisa poder ler/escrever.
-- Em Neon o role default já tem permissões, mas tornamos explícito.
-- =====================================================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'titulos_receber',
    'titulos_pagar',
    'baixas',
    'quotations',
    'quotation_items',
    'ordens_prod',
    'materiais'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('GRANT ALL ON %I TO PUBLIC', tbl);
  END LOOP;
END $$;
