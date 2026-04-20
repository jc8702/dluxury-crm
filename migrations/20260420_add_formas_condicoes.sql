-- Migration: adicionar formas_pagamento (se necessário) e condicoes_pagamento

BEGIN;

CREATE TABLE IF NOT EXISTS condicoes_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(150) NOT NULL,
  descricao text,
  parcelas integer NOT NULL DEFAULT 1,
  entrada_percentual numeric(5,2) DEFAULT 0,
  juros_percentual numeric(5,2) DEFAULT 0,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT now()
);

COMMIT;
