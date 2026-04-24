import 'dotenv/config';
import { sql } from './src/api-lib/_db.js';

async function migrate() {
  try {
    console.log('Removendo TODAS as constraints e migrando colunas para TEXT...');
    
    // Lista de possíveis nomes de constraints baseadas no erro
    await sql`ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_cliente_id_fkey`;
    await sql`ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_projeto_id_fkey`;
    await sql`ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_responsavel_id_fkey`;
    await sql`ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_criado_por_fkey`;

    await sql`ALTER TABLE eventos ALTER COLUMN cliente_id TYPE TEXT USING cliente_id::TEXT`;
    await sql`ALTER TABLE eventos ALTER COLUMN projeto_id TYPE TEXT USING projeto_id::TEXT`;
    await sql`ALTER TABLE eventos ALTER COLUMN criado_por TYPE TEXT USING criado_por::TEXT`;
    await sql`ALTER TABLE eventos ALTER COLUMN responsavel_id TYPE TEXT USING responsavel_id::TEXT`;
    
    console.log('Sucesso!');
  } catch (e) {
    console.error('ERRO NA MIGRAÇÃO:', e.message);
  }
}

migrate();
