-- Recriar tabelas de Projetos e Planos de Corte
-- Executar no Neon SQL Editor

-- ============================================
-- TABELA: PROJETOS
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id INTEGER,
    client_name TEXT,
    ambiente TEXT,
    descricao TEXT,
    valor_estimado NUMERIC(15,2),
    valor_final NUMERIC(15,2),
    prazo_entrega DATE,
    status TEXT DEFAULT 'lead',
    etapa_producao TEXT,
    responsavel TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para projetos
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ============================================
-- TABELA: PLANOS DE CORTE
-- ============================================
CREATE TABLE IF NOT EXISTS planos_de_corte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    sku_engenharia VARCHAR(100),
    kerf_mm INTEGER DEFAULT 3,
    materiais JSONB NOT NULL,
    resultado JSONB,
    observacoes TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: ERP CHAPAS (estoque industrial)
-- ============================================
CREATE TABLE IF NOT EXISTS erp_chapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    largura_mm INTEGER NOT NULL,
    altura_mm INTEGER NOT NULL,
    espessura_mm INTEGER NOT NULL,
    preco_unitario NUMERIC(12,2),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: ERP SKUS ENGENHARIA
-- ============================================
CREATE TABLE IF NOT EXISTS erp_skus_engenharia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    componentes JSONB NOT NULL,
    versao INTEGER DEFAULT 1,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: ERP PROJECT ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS erp_project_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: ERP CONSUMPTION RESULTS
-- ============================================
CREATE TABLE IF NOT EXISTS erp_consumption_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_item_id UUID REFERENCES erp_project_items(id),
    componente_nome TEXT,
    sku_id UUID,
    quantidade_com_perda NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: ORDENS DE PRODUÇÃO
-- ============================================
CREATE TABLE IF NOT EXISTS ordens_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projeto_id UUID REFERENCES projects(id),
    status TEXT DEFAULT 'pendente',
    data_inicio DATE,
    data_prevista DATE,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT 'Tabelas criadas com sucesso!' as status;