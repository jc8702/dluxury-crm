import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function fix() {
  const dbUrl = process.env.DATABASE_URL;
  const sql = neon(dbUrl);
  
  console.log('Executando correções estruturais...');
  
  await sql`ALTER TABLE retalhos_estoque ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
  await sql`ALTER TABLE retalhos_estoque ADD COLUMN IF NOT EXISTS metadata JSONB`;
  await sql`ALTER TABLE retalhos_estoque ADD COLUMN IF NOT EXISTS disponivel BOOLEAN DEFAULT TRUE`;
  await sql`ALTER TABLE retalhos_estoque ADD COLUMN IF NOT EXISTS utilizado_em_id UUID`;
  
  console.log('Banco de dados sincronizado com a aplicação!');
}

fix().catch(console.error);
