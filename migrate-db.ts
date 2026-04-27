import 'dotenv/config';
import { sql } from './src/api-lib/_db.ts';

async function migrate() {
  console.log('Iniciando migração...');
  try {
    // 1. Billings - erp
    await sql`ALTER TABLE billings ADD COLUMN IF NOT EXISTS erp TEXT`;
    console.log('Coluna erp adicionada a billings.');

    // 2. Kanban Items - date_time, visit_format, description
    await sql`ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS date_time TIMESTAMP WITH TIME ZONE`;
    await sql`ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS visit_format TEXT`;
    await sql`ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS description TEXT`;
    console.log('Colunas adicionadas a kanban_items.');

    // 3. Clients - codigo_erp (já deve existir, mas garantindo)
    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS codigo_erp TEXT`;
    console.log('Coluna codigo_erp adicionada a clients.');

    // 4. Materiais - Campos Fiscais e Precificação
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS cfop TEXT`;
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS ncm TEXT`;
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS icms NUMERIC`;
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS icms_st NUMERIC`;
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS ipi NUMERIC`;
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS pis NUMERIC`;
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS cofins NUMERIC`;
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS origem INTEGER DEFAULT 0`;
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS preco_venda NUMERIC`;
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS margem_lucro NUMERIC`;
    console.log('Colunas fiscais e de precificação adicionadas a materiais.');

    // 5. Itens Orçamento - Campos Fiscais
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS cfop TEXT`;
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS ncm TEXT`;
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS icms NUMERIC`;
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS icms_st NUMERIC`;
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS ipi NUMERIC`;
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS pis NUMERIC`;
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS cofins NUMERIC`;
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS origem INTEGER DEFAULT 0`;
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS erp_product_id UUID`;
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS erp_parametros JSONB`;
    console.log('Colunas de integração ERP adicionadas a itens_orcamento.');
    // 6. Planos de Corte - Foreign Keys
    await sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS visita_id UUID`;
    await sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS projeto_id UUID`;
    await sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS orcamento_id UUID`;
    await sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS ordem_producao_id UUID`;
    console.log('Colunas de FK adicionadas a planos_de_corte.');

    console.log('Migração concluída com sucesso!');
    process.exit(0);
  } catch (e) {
    console.error('Erro na migração:', e);
    process.exit(1);
  }
}

migrate();
