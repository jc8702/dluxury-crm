
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  try {
    await sql`ALTER TABLE orcamentos RENAME COLUMN criado_em TO created_at`;
    console.log('Renamed orcamentos.criado_em');
  } catch (e) { console.log('orcamentos.criado_em skip'); }

  try {
    await sql`ALTER TABLE orcamentos RENAME COLUMN atualizado_em TO updated_at`.catch(() => {});
    console.log('Renamed orcamentos.atualizado_em');

    await sql`ALTER TABLE movimentacoes_estoque RENAME COLUMN criado_em TO created_at`.catch(() => {});
    console.log('Renamed mov.created_at');
    await sql`ALTER TABLE movimentacoes_estoque RENAME COLUMN criado_por TO created_by`.catch(() => {});
    console.log('Renamed mov.created_by');

    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`;
    console.log('Ensured updated_at in projects');
  } catch (e) { console.log('projects.updated_at skip'); }

  console.log('Migração de emergência concluída.');
}

migrate();
