import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    console.log("Dropping tables...");
    await sql`DROP TABLE IF EXISTS itens_orcamento CASCADE`;
    await sql`DROP TABLE IF EXISTS orcamentos CASCADE`;
    
    console.log("Recreating orcamentos...");
    await sql`
      CREATE TABLE IF NOT EXISTS orcamentos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cliente_id INTEGER REFERENCES clients(id),
        projeto_id TEXT, -- Pode vir do novo projects(uuid) ou do kanban antigo (integer)
        numero TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'rascunho',
        valor_base NUMERIC(12,2) DEFAULT 0,
        taxa_mensal NUMERIC(5,4) DEFAULT 0,
        condicao_pagamento_id UUID REFERENCES condicoes_pagamento(id),
        valor_final NUMERIC(12,2) DEFAULT 0,
        prazo_entrega_dias INTEGER DEFAULT 45,
        prazo_tipo TEXT DEFAULT 'padrao',
        adicional_urgencia_pct NUMERIC(5,4) DEFAULT 0.15,
        observacoes TEXT,
        materiais_consumidos JSONB DEFAULT '[]',
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log("Recreating itens_orcamento...");
    await sql`
      CREATE TABLE IF NOT EXISTS itens_orcamento (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        orcamento_id UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
        descricao TEXT,
        ambiente TEXT,
        largura_cm NUMERIC(10,2),
        altura_cm NUMERIC(10,2),
        profundidade_cm NUMERIC(10,2),
        material TEXT,
        acabamento TEXT,
        quantidade INTEGER DEFAULT 1,
        valor_unitario NUMERIC(12,2) DEFAULT 0,
        valor_total NUMERIC(12,2) DEFAULT 0
      )
    `;
    console.log("Success!");
  } catch (err: any) {
    console.error(err);
  }
}

main();
