-- Tabela de estoque de retalhos (sobras de corte reutilizáveis)
CREATE TABLE IF NOT EXISTS retalhos_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- DIMENSÕES
  largura_mm INT NOT NULL,
  altura_mm INT NOT NULL,
  espessura_mm INT NOT NULL,
  
  -- MATERIAL
  sku_chapa VARCHAR(100) NOT NULL,
  -- Ex: 'MDF-BRANCO-18', 'MDF-GRAFITO-15'
  
  nome_material VARCHAR(255),
  -- Nome amigável para exibição
  
  -- ORIGEM
  origem VARCHAR(50) NOT NULL,
  -- Valores: 'sobra_plano_corte', 'devolucao', 'manual'
  
  plano_corte_origem_id UUID,
  -- Referência para qual plano gerou este retalho
  
  projeto_origem VARCHAR(255),
  -- Qual projeto gerou: 'Cozinha AP 402', etc
  
  -- ESTADO
  disponivel BOOLEAN DEFAULT true,
  utilizado_em_id UUID,
  -- Qual novo plano utilizou este retalho
  
  descartado BOOLEAN DEFAULT false,
  motivo_descarte VARCHAR(255),
  -- 'danificado', 'erro_corte', 'obsoleto'
  
  -- RASTREAMENTO
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  usuario_id UUID,
  
  -- METADADOS (Opcional, para extensibilidade)
  metadata JSONB
);

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_retalhos_sku_disponivel ON retalhos_estoque(sku_chapa, disponivel) WHERE descartado = false;
CREATE INDEX IF NOT EXISTS idx_retalhos_tamanho ON retalhos_estoque(largura_mm, altura_mm);
CREATE INDEX IF NOT EXISTS idx_retalhos_criado_em ON retalhos_estoque(criado_em);
