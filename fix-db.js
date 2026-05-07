import 'dotenv/config';
import { sql } from './src/api-lib/_db.ts';

async function runManualSQL() {
  console.log('--- EXECUTANDO SQL MANUAL ---');
  try {
    // Adicionar colunas de estoque
    await sql`ALTER TABLE erp_chapas ADD COLUMN IF NOT EXISTS estoque integer DEFAULT 0`;
    await sql`ALTER TABLE erp_chapas ADD COLUMN IF NOT EXISTS estoque_minimo integer DEFAULT 5`;
    
    // Garantir colunas em retalhos
    await sql`ALTER TABLE retalhos_estoque ADD COLUMN IF NOT EXISTS utilizado_em_id uuid`;
    await sql`ALTER TABLE retalhos_estoque ADD COLUMN IF NOT EXISTS data_utilizacao timestamp with time zone`;

    // CORREÇÃO PLANOS DE CORTE (Problem 4)
    await sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS visita_id uuid`;
    await sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS projeto_id uuid`;
    await sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS orcamento_id uuid`;
    await sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS ordem_producao_id uuid`;
    await sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone`;
    await sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS sku_engenharia varchar(100)`;
    
    // Mapear nomes antigos se existirem
    try { await sql`ALTER TABLE planos_de_corte RENAME COLUMN criado_em TO created_at`; } catch(e){}
    try { await sql`ALTER TABLE planos_de_corte RENAME COLUMN atualizado_em TO updated_at`; } catch(e){}

    console.log('✅ Comandos SQL executados com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro no SQL:', err);
    process.exit(1);
  }
}

runManualSQL();
