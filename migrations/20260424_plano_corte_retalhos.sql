CREATE TABLE IF NOT EXISTS retalhos_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_chapa VARCHAR(100) NOT NULL,
  largura_mm INTEGER NOT NULL,
  altura_mm INTEGER NOT NULL,
  espessura_mm INTEGER NOT NULL,
  origem VARCHAR(50), -- 'sobra_plano_corte', 'devolucao', 'manual'
  plano_corte_origem_id UUID REFERENCES planos_de_corte(id),
  disponivel BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retalhos_sku ON retalhos_estoque(sku_chapa);
CREATE INDEX IF NOT EXISTS idx_retalhos_tamanho ON retalhos_estoque(largura_mm, altura_mm);
