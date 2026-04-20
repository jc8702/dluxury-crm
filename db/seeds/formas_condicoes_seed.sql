-- Seed básico para formas e condições de pagamento

BEGIN;

INSERT INTO formas_pagamento (id, nome, tipo, taxa_percentual, prazo_compensacao_dias, ativa)
VALUES
  (gen_random_uuid(), 'Dinheiro', 'dinheiro', 0, 0, true),
  (gen_random_uuid(), 'PIX', 'pix', 0, 0, true),
  (gen_random_uuid(), 'Boleto', 'boleto', 0, 2, true),
  (gen_random_uuid(), 'Cartão de Crédito', 'cartao_credito', 3.5, 30, true),
  (gen_random_uuid(), 'Cartão de Débito', 'cartao_debito', 1.5, 0, true);

INSERT INTO condicoes_pagamento (id, nome, descricao, parcelas, entrada_percentual, juros_percentual, ativo)
VALUES
  (gen_random_uuid(), 'À Vista', 'Pagamento à vista com desconto', 1, 0, 0, true),
  (gen_random_uuid(), '30% Entrada + 70% Entrega', 'Entrada parcelada', 2, 30, 0, true),
  (gen_random_uuid(), 'Parcelado 3x sem juros', '3 parcelas sem juros', 3, 0, 0, true),
  (gen_random_uuid(), 'Parcelado 6x sem juros', '6 parcelas sem juros', 6, 0, 0, true);

COMMIT;
