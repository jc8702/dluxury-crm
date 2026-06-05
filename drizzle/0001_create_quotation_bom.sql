-- Migration: Create missing quotation_bom table
-- Reason: src/db/schema/quotations.ts:86-102 defines quotationBom and
-- src/api-lib/quotations.ts actively uses it for BOM explosion/management.
-- Without this table, any feature that triggers BOM explosion fails at runtime
-- with "relation 'quotation_bom' does not exist".

CREATE TABLE IF NOT EXISTS "quotation_bom" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "quotation_item_id" uuid REFERENCES "quotation_items"("id") ON DELETE CASCADE,
    "sku_componente_id" uuid REFERENCES "sku_componente"("id"),
    "quantidade_calculada" numeric(10, 3),
    "quantidade_ajustada" numeric(10, 3),
    "custo_unitario" numeric(10, 2),
    "origem" varchar(20) DEFAULT 'BOM',
    "editado" boolean DEFAULT false,
    "observacoes" text,
    "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_quot_bom_item" ON "quotation_bom" ("quotation_item_id");
CREATE INDEX IF NOT EXISTS "idx_quot_bom_sku" ON "quotation_bom" ("sku_componente_id");
