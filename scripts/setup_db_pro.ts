import { sql } from '../src/api-lib/_db.js';

async function setup() {
    console.log('🚀 Criando tabelas de Engenharia e Orçamentos...');
    try {
        await sql`
        CREATE TABLE IF NOT EXISTS sku_engenharia (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            codigo VARCHAR(20) UNIQUE NOT NULL,
            nome VARCHAR(200) NOT NULL,
            categoria VARCHAR(50),
            tipo_produto VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );`;

        await sql`
        CREATE TABLE IF NOT EXISTS sku_montagem (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            codigo VARCHAR(20) UNIQUE NOT NULL,
            nome VARCHAR(200) NOT NULL,
            unidade_medida VARCHAR(10) DEFAULT 'UN',
            tempo_montagem_min INTEGER,
            complexidade VARCHAR(20),
            created_at TIMESTAMP DEFAULT NOW()
        );`;

        await sql`
        CREATE TABLE IF NOT EXISTS sku_componente (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            codigo VARCHAR(20) UNIQUE NOT NULL,
            nome VARCHAR(200) NOT NULL,
            tipo VARCHAR(50),
            unidade_medida VARCHAR(10),
            dimensoes JSONB,
            preco_unitario DECIMAL(10,2),
            estoque_atual DECIMAL(10,3),
            created_at TIMESTAMP DEFAULT NOW()
        );`;

        await sql`
        CREATE TABLE IF NOT EXISTS bom_engenharia_montagem (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sku_engenharia_id UUID REFERENCES sku_engenharia(id) ON DELETE CASCADE,
            sku_montagem_id UUID REFERENCES sku_montagem(id),
            quantidade DECIMAL(10,3) NOT NULL,
            ordem_production INTEGER,
            observacoes TEXT,
            UNIQUE(sku_engenharia_id, sku_montagem_id)
        );`;

        await sql`
        CREATE TABLE IF NOT EXISTS bom_montagem_componente (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sku_montagem_id UUID REFERENCES sku_montagem(id) ON DELETE CASCADE,
            sku_componente_id UUID REFERENCES sku_componente(id),
            quantidade DECIMAL(10,3) NOT NULL,
            perda_percentual DECIMAL(5,2) DEFAULT 5.00,
            observacoes TEXT,
            UNIQUE(sku_montagem_id, sku_componente_id)
        );`;

        await sql`
        CREATE TABLE IF NOT EXISTS orcamentos_pro (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            numero_orcamento VARCHAR(30) UNIQUE NOT NULL,
            cliente_id INTEGER REFERENCES clients(id),
            projeto_id UUID REFERENCES planos_de_corte(id),
            data_orcamento TIMESTAMP DEFAULT NOW(),
            validade_dias INTEGER DEFAULT 15,
            prazo_entrega_dias INTEGER,
            descritivo_pagamento TEXT,
            condicoes_comerciais TEXT,
            margem_lucro_percentual DECIMAL(5,2),
            taxa_financeira_percentual DECIMAL(5,2) DEFAULT 0,
            desconto_percentual DECIMAL(5,2) DEFAULT 0,
            valor_total_custo DECIMAL(12,2),
            valor_total_venda DECIMAL(12,2),
            status VARCHAR(20) DEFAULT 'RASCUNHO',
            arquivo_sketchup_url TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );`;

        await sql`
        CREATE TABLE IF NOT EXISTS orcamento_itens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            orcamento_id UUID REFERENCES orcamentos_pro(id) ON DELETE CASCADE,
            sku_engenharia_id UUID REFERENCES sku_engenharia(id),
            quantidade DECIMAL(10,3) NOT NULL,
            custo_unitario_calculado DECIMAL(12,2),
            preco_venda_unitario DECIMAL(12,2),
            observacoes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );`;

        await sql`
        CREATE TABLE IF NOT EXISTS orcamento_lista_explodida (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            orcamento_item_id UUID REFERENCES orcamento_itens(id) ON DELETE CASCADE,
            sku_componente_id UUID REFERENCES sku_componente(id),
            quantidade_calculada DECIMAL(10,3),
            quantidade_ajustada DECIMAL(10,3),
            custo_unitario DECIMAL(10,2),
            origem VARCHAR(20) DEFAULT 'BOM',
            editado BOOLEAN DEFAULT FALSE,
            observacoes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );`;

        console.log('✅ Todas as tabelas foram criadas com sucesso!');
    } catch (err) {
        console.error('❌ Erro ao criar tabelas:', err);
    }
    process.exit(0);
}

setup();
