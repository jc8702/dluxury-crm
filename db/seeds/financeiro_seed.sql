-- Seed: classes financeiras padrão para marcenaria D'LUXURY
-- Importante: execute em ambiente de desenvolvimento antes de produção

BEGIN;

-- Receitas
INSERT INTO classes_financeiras (id, codigo, nome, tipo, natureza, pai_id, ativa, permite_lancamento, criado_em)
VALUES
  (gen_random_uuid(), '1', 'RECEITAS', 'sintetica', 'credora', NULL, true, false, now());

-- 1.1 VENDAS
WITH parent AS (SELECT id FROM classes_financeiras WHERE codigo = '1')
INSERT INTO classes_financeiras (id, codigo, nome, tipo, natureza, pai_id, ativa, permite_lancamento, criado_em)
VALUES
  (gen_random_uuid(), '1.1', 'VENDAS', 'sintetica', 'credora', (SELECT id FROM classes_financeiras WHERE codigo = '1'), true, false, now()),
  (gen_random_uuid(), '1.1.1', 'Projetos sob medida', 'analitica', 'credora', (SELECT id FROM classes_financeiras WHERE codigo = '1.1'), true, true, now()),
  (gen_random_uuid(), '1.1.2', 'Móveis prontos', 'analitica', 'credora', (SELECT id FROM classes_financeiras WHERE codigo = '1.1'), true, true, now()),
  (gen_random_uuid(), '1.1.3', 'Manutenção/Reparos', 'analitica', 'credora', (SELECT id FROM classes_financeiras WHERE codigo = '1.1'), true, true, now());

-- 1.2 SERVIÇOS ADICIONAIS
INSERT INTO classes_financeiras (id, codigo, nome, tipo, natureza, pai_id, ativa, permite_lancamento, criado_em)
VALUES
  (gen_random_uuid(), '1.2', 'SERVIÇOS ADICIONAIS', 'sintetica', 'credora', (SELECT id FROM classes_financeiras WHERE codigo = '1'), true, false, now()),
  (gen_random_uuid(), '1.2.1', 'Design/Projeto', 'analitica', 'credora', (SELECT id FROM classes_financeiras WHERE codigo = '1.2'), true, true, now()),
  (gen_random_uuid(), '1.2.2', 'Instalação', 'analitica', 'credora', (SELECT id FROM classes_financeiras WHERE codigo = '1.2'), true, true, now()),
  (gen_random_uuid(), '1.2.3', 'Montagem', 'analitica', 'credora', (SELECT id FROM classes_financeiras WHERE codigo = '1.2'), true, true, now());

-- 1.3 OUTRAS RECEITAS
INSERT INTO classes_financeiras (id, codigo, nome, tipo, natureza, pai_id, ativa, permite_lancamento, criado_em)
VALUES
  (gen_random_uuid(), '1.3', 'OUTRAS RECEITAS', 'sintetica', 'credora', (SELECT id FROM classes_financeiras WHERE codigo = '1'), true, false, now()),
  (gen_random_uuid(), '1.3.1', 'Sobras de material vendidas', 'analitica', 'credora', (SELECT id FROM classes_financeiras WHERE codigo = '1.3'), true, true, now()),
  (gen_random_uuid(), '1.3.2', 'Receitas financeiras', 'analitica', 'credora', (SELECT id FROM classes_financeiras WHERE codigo = '1.3'), true, true, now());

-- Despesas
INSERT INTO classes_financeiras (id, codigo, nome, tipo, natureza, pai_id, ativa, permite_lancamento, criado_em)
VALUES
  (gen_random_uuid(), '2', 'DESPESAS', 'sintetica', 'devedora', NULL, true, false, now());

-- 2.1 MATÉRIA-PRIMA
INSERT INTO classes_financeiras (id, codigo, nome, tipo, natureza, pai_id, ativa, permite_lancamento, criado_em)
VALUES
  (gen_random_uuid(), '2.1', 'MATÉRIA-PRIMA', 'sintetica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2'), true, false, now()),
  (gen_random_uuid(), '2.1.1', 'Chapas (MDF, MDP, compensado)', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.1'), true, true, now()),
  (gen_random_uuid(), '2.1.2', 'Ferragens (dobradiças, corrediças, puxadores)', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.1'), true, true, now()),
  (gen_random_uuid(), '2.1.3', 'Fitas de borda', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.1'), true, true, now()),
  (gen_random_uuid(), '2.1.4', 'Cola, parafusos, insumos', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.1'), true, true, now());

-- 2.2 MÃO DE OBRA
INSERT INTO classes_financeiras (id, codigo, nome, tipo, natureza, pai_id, ativa, permite_lancamento, criado_em)
VALUES
  (gen_random_uuid(), '2.2', 'MÃO DE OBRA', 'sintetica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2'), true, false, now()),
  (gen_random_uuid(), '2.2.1', 'Marceneiros próprios', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.2'), true, true, now()),
  (gen_random_uuid(), '2.2.2', 'Terceirizados/Freelancers', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.2'), true, true, now()),
  (gen_random_uuid(), '2.2.3', 'Instaladores', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.2'), true, true, now());

-- 2.3 OPERACIONAIS
INSERT INTO classes_financeiras (id, codigo, nome, tipo, natureza, pai_id, ativa, permite_lancamento, criado_em)
VALUES
  (gen_random_uuid(), '2.3', 'OPERACIONAIS', 'sintetica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2'), true, false, now()),
  (gen_random_uuid(), '2.3.1', 'Aluguel/Condomínio', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.3'), true, true, now()),
  (gen_random_uuid(), '2.3.2', 'Energia elétrica', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.3'), true, true, now()),
  (gen_random_uuid(), '2.3.3', 'Água', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.3'), true, true, now()),
  (gen_random_uuid(), '2.3.4', 'Telefone/Internet', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.3'), true, true, now()),
  (gen_random_uuid(), '2.3.5', 'Manutenção equipamentos', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.3'), true, true, now());

-- 2.4 COMERCIAL/MARKETING
INSERT INTO classes_financeiras (id, codigo, nome, tipo, natureza, pai_id, ativa, permite_lancamento, criado_em)
VALUES
  (gen_random_uuid(), '2.4', 'COMERCIAL/MARKETING', 'sintetica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2'), true, false, now()),
  (gen_random_uuid(), '2.4.1', 'Comissões vendedores', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.4'), true, true, now()),
  (gen_random_uuid(), '2.4.2', 'Publicidade', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.4'), true, true, now()),
  (gen_random_uuid(), '2.4.3', 'Amostras/Catálogos', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.4'), true, true, now());

-- 2.5 LOGÍSTICA
INSERT INTO classes_financeiras (id, codigo, nome, tipo, natureza, pai_id, ativa, permite_lancamento, criado_em)
VALUES
  (gen_random_uuid(), '2.5', 'LOGÍSTICA', 'sintetica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2'), true, false, now()),
  (gen_random_uuid(), '2.5.1', 'Frete compras', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.5'), true, true, now()),
  (gen_random_uuid(), '2.5.2', 'Entrega clientes', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.5'), true, true, now()),
  (gen_random_uuid(), '2.5.3', 'Combustível', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.5'), true, true, now());

-- 2.6 ADMINISTRATIVAS
INSERT INTO classes_financeiras (id, codigo, nome, tipo, natureza, pai_id, ativa, permite_lancamento, criado_em)
VALUES
  (gen_random_uuid(), '2.6', 'ADMINISTRATIVAS', 'sintetica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2'), true, false, now()),
  (gen_random_uuid(), '2.6.1', 'Impostos', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.6'), true, true, now()),
  (gen_random_uuid(), '2.6.2', 'Contador', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.6'), true, true, now()),
  (gen_random_uuid(), '2.6.3', 'Seguros', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.6'), true, true, now()),
  (gen_random_uuid(), '2.6.4', 'Despesas bancárias', 'analitica', 'devedora', (SELECT id FROM classes_financeiras WHERE codigo = '2.6'), true, true, now());

COMMIT;
