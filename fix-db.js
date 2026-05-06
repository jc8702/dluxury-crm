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

    console.log('✅ Comandos SQL executados com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro no SQL:', err);
    process.exit(1);
  }
}

runManualSQL();
