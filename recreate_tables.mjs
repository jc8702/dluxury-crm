import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  // TABELA: PROJETOS
  await sql`CREATE TABLE IF NOT EXISTS projects (
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
  )`;
  
  await sql`CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`;

  // TABELA: PLANOS DE CORTE
  await sql`CREATE TABLE IF NOT EXISTS planos_de_corte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    sku_engenharia VARCHAR(100),
    kerf_mm INTEGER DEFAULT 3,
    materiais JSONB NOT NULL,
    resultado JSONB,
    observacoes TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
  )`;

  // ERP CHAPAS
  await sql`CREATE TABLE IF NOT EXISTS erp_chapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    largura_mm INTEGER NOT NULL,
    altura_mm INTEGER NOT NULL,
    espessura_mm INTEGER NOT NULL,
    preco_unitario NUMERIC(12,2),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  // ERP SKUS ENGENHARIA
  await sql`CREATE TABLE IF NOT EXISTS erp_skus_engenharia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    componentes JSONB NOT NULL,
    versao INTEGER DEFAULT 1,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  // ERP PROJECT ITEMS
  await sql`CREATE TABLE IF NOT EXISTS erp_project_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  // ERP CONSUMPTION RESULTS
  await sql`CREATE TABLE IF NOT EXISTS erp_consumption_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_item_id UUID REFERENCES erp_project_items(id),
    componente_nome TEXT,
    sku_id UUID,
    quantidade_com_perda NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  // ORDENS DE PRODUÇÃO
  await sql`CREATE TABLE IF NOT EXISTS ordens_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projeto_id UUID REFERENCES projects(id),
    status TEXT DEFAULT 'pendente',
    data_inicio DATE,
    data_prevista DATE,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  console.log('✅ Tabelas criadas com sucesso!');
  
  const r1 = await sql`SELECT COUNT(*) as cnt FROM projects`;
  console.log('  projects:', r1[0].cnt, 'rows');
  
  const r2 = await sql`SELECT COUNT(*) as cnt FROM planos_de_corte`;
  console.log('  planos_de_corte:', r2[0].cnt, 'rows');
  
  console.log('\n📋 Todas as tabelas do sistema:');
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('projects', 'planos_de_corte', 'erp_chapas', 'erp_skus_engenharia', 'erp_project_items', 'erp_consumption_results', 'ordens_producao')
  `;
  console.log('\n📋 Tabelas verificadas:');
  rows.forEach(r => console.log('  ✓', r.tablename));
}

main().catch(console.error);