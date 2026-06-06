-- Migration 0004: Create missing tables.
-- ADR-2026-06-05-01 / audit 2026-06-05 §1.2.
-- Two tables are referenced by app code but missing from the DB:
--   - erp_inventory  (consumed by _inventory.ts and projects.ts)
--   - quotation_bom  (declared in drizzle/0001 but never registered in journal)
-- Idempotent: IF NOT EXISTS.

-- =====================================================================
-- erp_inventory
-- =====================================================================

CREATE TABLE IF NOT EXISTS erp_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku_id UUID NOT NULL,
  estoque_reservado NUMERIC(15,4) NOT NULL DEFAULT 0,
  estoque_disponivel NUMERIC(15,4) NOT NULL DEFAULT 0,
  estoque_total NUMERIC(15,4) GENERATED ALWAYS AS
    (estoque_reservado + estoque_disponivel) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_inventory_tenant_id
  ON erp_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_erp_inventory_sku_id
  ON erp_inventory(sku_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_inventory_tenant_sku
  ON erp_inventory(tenant_id, sku_id);

-- =====================================================================
-- quotation_bom
-- =====================================================================

CREATE TABLE IF NOT EXISTS quotation_bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  componente_id UUID,
  quantidade NUMERIC(15,4) NOT NULL,
  custo_unitario NUMERIC(15,4) NOT NULL,
  custo_total NUMERIC(15,4) GENERATED ALWAYS AS
    (quantidade * custo_unitario) STORED,
  observacoes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_bom_tenant_id
  ON quotation_bom(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotation_bom_quotation_id
  ON quotation_bom(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_bom_componente_id
  ON quotation_bom(componente_id);

-- =====================================================================
-- RLS também nestas
-- =====================================================================

ALTER TABLE erp_inventory   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_bom   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON erp_inventory;
CREATE POLICY tenant_isolation ON erp_inventory
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation ON quotation_bom;
CREATE POLICY tenant_isolation ON quotation_bom
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

GRANT ALL ON erp_inventory TO PUBLIC;
GRANT ALL ON quotation_bom TO PUBLIC;
