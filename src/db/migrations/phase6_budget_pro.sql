-- Migration: Evolução Profissional do Módulo de Orçamentos (D'Luxury CRM)
-- Data: 2026-05-10
-- Objetivo: Suporte a snapshots, overrides, precificação dinâmica e auditoria

-- 1. Expansão da tabela de itens de orçamento
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS unidade_medida VARCHAR(20) DEFAULT 'UN';
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS custo_base_estoque DECIMAL(12,2); -- Snapshot do custo no momento da importação
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS custo_sobrescrito DECIMAL(12,2);   -- Valor manual definido pelo usuário
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS preco_venda_sobrescrito DECIMAL(12,2); -- Valor manual de venda
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS markup DECIMAL(10,4);
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS margem_lucro DECIMAL(10,4);
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS origem_dados VARCHAR(50) DEFAULT 'CSV'; -- CSV, MANUAL, SKU_MATCH
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS possui_override BOOLEAN DEFAULT FALSE;
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Índices de performance para busca e filtros
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_sku_codigo ON orcamento_itens (sku_codigo);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_orcamento_id ON orcamento_itens (orcamento_id);

-- 3. Atualizar dados existentes (Migração de sanidade)
UPDATE orcamento_itens SET 
    custo_base_estoque = custo_unitario_calculado,
    origem_dados = 'CSV'
WHERE custo_base_estoque IS NULL;

-- 4. Função de atualização de timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_orcamento_itens_updated_at ON orcamento_itens;
CREATE TRIGGER update_orcamento_itens_updated_at
    BEFORE UPDATE ON orcamento_itens
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
