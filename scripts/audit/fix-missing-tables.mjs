import dotenv from 'dotenv'; dotenv.config({path:'.env'}); import { neon } from '@neondatabase/serverless'; const sql=neon(process.env.DATABASE_URL);
console.log('fix missing tables on', (process.env.DATABASE_URL.split('@')[1]||'').split('/')[0]);
try {
  await sql`CREATE TABLE IF NOT EXISTS materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT,
    nome TEXT,
    descricao TEXT,
    categoria_id TEXT,
    subcategoria TEXT,
    unidade_compra TEXT,
    unidade_uso TEXT,
    fator_conversao NUMERIC,
    estoque_minimo NUMERIC,
    preco_custo NUMERIC,
    fornecedor_principal TEXT,
    observacoes TEXT,
    cfop TEXT,
    ncm TEXT,
    largura_mm NUMERIC,
    altura_mm NUMERIC,
    preco_venda NUMERIC,
    margem_lucro NUMERIC,
    icms NUMERIC,
    icms_st NUMERIC,
    ipi NUMERIC,
    pis NUMERIC,
    cofins NUMERIC,
    origem TEXT,
    marca TEXT,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT true,
    estoque_atual NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  console.log('materiais ok');
} catch(e){ console.log('materiais err',e.message.slice(0,500)) }
try {
  await sql`CREATE TABLE IF NOT EXISTS pedidos_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero TEXT,
    fornecedor_id TEXT,
    status TEXT DEFAULT 'aberto',
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  console.log('pedidos_compra ok');
} catch(e){ console.log('pedidos err',e.message.slice(0,500)) }
try {
  await sql`CREATE TABLE IF NOT EXISTS pedido_compra_itens (
    id SERIAL PRIMARY KEY,
    pedido_id UUID REFERENCES pedidos_compra(id) ON DELETE CASCADE,
    sku TEXT,
    quantidade NUMERIC,
    tenant_id UUID
  )`;
  console.log('pedido_compra_itens ok');
} catch(e){ console.log('pedido_compra_itens err',e.message.slice(0,400))}
try {
  // fix chamados_garantia unique
  await sql`ALTER TABLE chamados_garantia DROP CONSTRAINT IF EXISTS chamados_garantia_numero_key`;
  console.log('drop unique chamados ok');
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS chamados_garantia_tenant_numero ON chamados_garantia (tenant_id, numero)`;
  console.log('create unique per tenant ok');
} catch(e){ console.log('chamados fix err',e.message.slice(0,500))}
console.log('done fix');
