-- Sincronização de Tabelas Financeiras e Compras
DROP TABLE IF EXISTS condicoes_pagamento CASCADE;

CREATE TABLE condicoes_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  parcelas INTEGER DEFAULT 1,
  entrada_percentual NUMERIC(5,2) DEFAULT 0,
  juros_percentual NUMERIC(5,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO condicoes_pagamento (nome, descricao, parcelas) 
VALUES 
  ('À Vista', 'Pagamento em parcela única', 1),
  ('2x Sem Juros', 'Entrada + 30 dias', 2),
  ('3x Sem Juros', 'Entrada + 30/60 dias', 3);

-- Adicionar coluna de condição de pagamento em pedidos de compra se não existir
ALTER TABLE pedidos_compra ADD COLUMN IF NOT EXISTS condicao_pagamento_id UUID REFERENCES condicoes_pagamento(id);
