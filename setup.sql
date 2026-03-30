-- SETUP SCRIPT FOR NEON POSTGRESQL (CORPSIM CRM)
-- Execute este script no Console do Neon para preparar as tabelas.

DROP TABLE IF EXISTS system_logs;
DROP TABLE IF EXISTS billings;
DROP TABLE IF EXISTS kanban_items;
DROP TABLE IF EXISTS clients;

-- 1. Clients Table (CRM)
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    razao_social TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    historico TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Billings Table (Dashboard/CRM)
CREATE TABLE billings (
    id SERIAL PRIMARY KEY,
    nf TEXT NOT NULL,
    pedido TEXT NOT NULL,
    cliente TEXT NOT NULL,
    erp TEXT,
    valor DECIMAL(12,2) NOT NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Kanban (Workflows)
CREATE TABLE kanban_items (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    label TEXT,
    status TEXT NOT NULL,
    type TEXT NOT NULL, -- 'project' ou 'visit'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Audit Logs (SRE)
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dados iniciais de teste (opcional)
INSERT INTO clients (razao_social, cnpj, historico) VALUES ('MUELLER S/A', '12.345.678/0001-90', 'Cliente Premium');
INSERT INTO kanban_items (title, subtitle, status, type) VALUES ('Implementação API', 'Metalúrgica Silva', 'prospeccao', 'project');

-- 6. Expansão de Clientes (Cartão CNPJ)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS porte TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_abertura TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cnae_principal TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cnae_secundario TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS natureza_juridica TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS municipio TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS uf TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS situacao_cadastral TEXT DEFAULT 'ATIVA';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_situacao_cadastral TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS motivo_situacao TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS codigo_erp TEXT;
