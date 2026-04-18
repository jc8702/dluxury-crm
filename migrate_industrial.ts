import 'dotenv/config';
import { sql } from './src/api-lib/_db.js';

async function migrateIndustrial() {
  console.log('--- Iniciando Migração Industrial ---');
  try {
    // 1. Engenharia (erp_product_bom)
    console.log('Atualizando schema de Engenharia (erp_product_bom)...');
    await sql`CREATE TABLE IF NOT EXISTS erp_product_bom (id UUID PRIMARY KEY DEFAULT gen_random_uuid())`;
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS nome TEXT`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS codigo_modelo TEXT`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS descricao TEXT`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS regras_calculo JSONB DEFAULT '[]'`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS largura_padrao NUMERIC DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS altura_padrao NUMERIC DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS profundidade_padrao NUMERIC DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS horas_mo_padrao NUMERIC DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS valor_hora_padrao NUMERIC DEFAULT 150`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS preco_material_m3_padrao NUMERIC DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW()`.catch(() => {});

    try { await sql`ALTER TABLE erp_product_bom ADD CONSTRAINT erp_product_bom_unique_code UNIQUE (codigo_modelo)`; } catch(e){}

    // 2. Billings (Garantir due_date)
    console.log('Verificando billing due_date...');
    await sql`ALTER TABLE billings ADD COLUMN IF NOT EXISTS due_date DATE`.catch(() => {});

    // 3. Fornecedores
    console.log('Verificando tabela de Fornecedores...');
    await sql`CREATE TABLE IF NOT EXISTS fornecedores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL,
        cnpj TEXT,
        contato TEXT,
        telefone TEXT,
        email TEXT,
        cidade TEXT,
        estado TEXT,
        observacoes TEXT,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMPTZ DEFAULT NOW()
    )`;

    console.log('--- Migração Concluída com Sucesso ---');
  } catch (e) {
    console.error('Erro na migração:', e.message);
    process.exit(1);
  }
  process.exit(0);
}

migrateIndustrial();
