import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('No DATABASE_URL');
  
  const sql = neon(dbUrl);
  
  console.log('Adicionando coluna metadata...');
  await sql`ALTER TABLE retalhos_estoque ADD COLUMN IF NOT EXISTS metadata JSONB`;
  console.log('Coluna metadata adicionada com sucesso!');
}

migrate().catch(console.error);
