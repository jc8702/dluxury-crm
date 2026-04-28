-- ════════════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: TABELA DE TIPOS DE PROJETO (ENGENHARIA PARAMÉTRICA)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS projeto_tipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    regras_bom JSONB NOT NULL, -- Ex: [{"nome": "Lateral", "formula": "ALTURA", "material_default": "MDF 18mm"}]
    dimensoes_referencia JSONB, -- Ex: {"L": 600, "A": 700, "P": 450}
    regras_validacao JSONB,     -- Ex: {"L": {"min": 300, "max": 1200}}
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados iniciais para o Gaveteiro (MVP)
INSERT INTO projeto_tipos (nome, slug, descricao, regras_bom, dimensoes_referencia, regras_validacao)
VALUES (
    'Gaveteiro Padrão', 
    'gaveteiro-padrao', 
    'Gaveteiro 3 gavetas com laterais passantes',
    '[
        {"nome": "Lateral", "qtd": 2, "l": "P", "a": "A", "material": "MDF 18mm"},
        {"nome": "Base", "qtd": 1, "l": "L - 36", "a": "P", "material": "MDF 18mm"},
        {"nome": "Tampo", "qtd": 1, "l": "L - 36", "a": "P", "material": "MDF 18mm"},
        {"nome": "Fundo", "qtd": 1, "l": "L - 4", "a": "A - 4", "material": "HDF 6mm"}
    ]'::jsonb,
    '{"L": 600, "A": 700, "P": 450}'::jsonb,
    '{"L": {"min": 250, "max": 1000}, "A": {"min": 300, "max": 1200}, "P": {"min": 300, "max": 600}}'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Inserir dados iniciais para Armário
INSERT INTO projeto_tipos (nome, slug, descricao, regras_bom, dimensoes_referencia, regras_validacao)
VALUES (
    'Armário 2 Portas', 
    'armario-2-portas', 
    'Armário aéreo ou balcão padrão',
    '[
        {"nome": "Lateral", "qtd": 2, "l": "P", "a": "A", "material": "MDF 18mm"},
        {"nome": "Base", "qtd": 1, "l": "L - 36", "a": "P", "material": "MDF 18mm"},
        {"nome": "Prateleira", "qtd": 1, "l": "L - 38", "a": "P - 20", "material": "MDF 18mm"},
        {"nome": "Porta", "qtd": 2, "l": "(L/2) - 4", "a": "A - 4", "material": "MDF 18mm"}
    ]'::jsonb,
    '{"L": 800, "A": 600, "P": 350}'::jsonb,
    '{"L": {"min": 400, "max": 1200}, "A": {"min": 300, "max": 1000}, "P": {"min": 200, "max": 600}}'::jsonb
) ON CONFLICT (slug) DO NOTHING;
