-- Seed: Estrutura inicial de Classes Financeiras (Idempotente)
-- Hierarquia: Receitas (1.0), Despesas (2.0)

BEGIN;

-- RECEITAS
INSERT INTO classes_financeiras (codigo, nome, tipo, natureza, permite_lancamento) VALUES 
('1.0', 'RECEITAS', 'receita', 'credito', false),
('1.1', 'RECEITAS OPERACIONAIS', 'receita', 'credito', false),
('1.1.01', 'Venda de Produtos', 'receita', 'credito', true),
('1.1.02', 'Venda de Servicos', 'receita', 'credito', true),
('1.1.03', 'Projetos de Design', 'receita', 'credito', true),
('1.2', 'RECEITAS FINANCEIRAS', 'receita', 'credito', false),
('1.2.01', 'Rendimentos de Aplicacao', 'receita', 'credito', true),
('1.2.02', 'Juros Recebidos', 'receita', 'credito', true)
ON CONFLICT (codigo) DO NOTHING;

-- DESPESAS
INSERT INTO classes_financeiras (codigo, nome, tipo, natureza, permite_lancamento) VALUES 
('2.0', 'DESPESAS', 'despesa', 'debito', false),
('2.1', 'DESPESAS COM PESSOAL', 'despesa', 'debito', false),
('2.1.01', 'Salarios e Pro-labore', 'despesa', 'debito', true),
('2.1.02', 'Encargos Sociais', 'despesa', 'debito', true),
('2.1.03', 'Beneficios (VA/VR)', 'despesa', 'debito', true),
('2.2', 'DESPESAS ADMINISTRATIVAS', 'despesa', 'debito', false),
('2.2.01', 'Aluguel e Condominio', 'despesa', 'debito', true),
('2.2.02', 'Energia e Agua', 'despesa', 'debito', true),
('2.2.03', 'Internet e Telefone', 'despesa', 'debito', true),
('2.2.04', 'Material de Escritorio', 'despesa', 'debito', true),
('2.3', 'IMPOSTOS E TAXAS', 'despesa', 'debito', false),
('2.3.01', 'Simples Nacional / DAS', 'despesa', 'debito', true),
('2.3.02', 'Taxas Bancarias', 'despesa', 'debito', true),
('2.4', 'CUSTOS DE PRODUCAO', 'despesa', 'debito', false),
('2.4.01', 'Materia-prima', 'despesa', 'debito', true),
('2.4.02', 'Fretes e Logistica', 'despesa', 'debito', true)
ON CONFLICT (codigo) DO NOTHING;

COMMIT;
