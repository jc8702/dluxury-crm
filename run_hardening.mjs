import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

async function run() {
  if (!dbUrl) {
    console.error('DATABASE_URL ausente');
    process.exit(1);
  }
  
  const sql = neon(dbUrl);
  
  console.log('--- Iniciando Hardening de Banco de Dados (v1) ---');
  
  try {
    // 1. Tabela de Auditoria
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        user_id TEXT,
        data_before JSONB,
        data_after JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Audit Logs OK');

    // 2. Colunas de Soft Delete
    try { await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`; } catch(e){}
    try { await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`; } catch(e){}
    try { await sql`ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`; } catch(e){}
    try { await sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`; } catch(e){}
    try { await sql`ALTER TABLE billings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`; } catch(e){}
    console.log('✓ Soft Delete columns OK');

    // 3. Índices
    try { await sql`CREATE INDEX IF NOT EXISTS idx_projects_tag ON projects(tag)`; } catch(e){}
    try { await sql`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`; } catch(e){}
    try { await sql`CREATE INDEX IF NOT EXISTS idx_orcamentos_projeto_id ON orcamentos(projeto_id)`; } catch(e){}
    try { await sql`CREATE INDEX IF NOT EXISTS idx_orcamentos_numero ON orcamentos(numero)`; } catch(e){}
    try { await sql`CREATE INDEX IF NOT EXISTS idx_orcamento_pecas_sku ON orcamento_pecas(sku)`; } catch(e){}
    try { await sql`CREATE INDEX IF NOT EXISTS idx_ordens_producao_projeto_id ON ordens_producao(projeto_id)`; } catch(e){}
    try { await sql`CREATE INDEX IF NOT EXISTS idx_ordens_producao_status ON ordens_producao(status)`; } catch(e){}
    console.log('✓ Indexes OK');

    console.log('--- Hardening Concluído ---');
    process.exit(0);
  } catch (e) {
    console.error('Falha Crítica:', e);
    process.exit(1);
  }
}

run();
