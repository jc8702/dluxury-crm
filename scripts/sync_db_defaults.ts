import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function syncDefaults() {
  const dbUrl = process.env.DATABASE_URL;
  const sql = neon(dbUrl);
  
  console.log('Sincronizando DEFAULTS e constraints...');
  
  try {
    await sql`ALTER TABLE retalhos_estoque ALTER COLUMN disponivel SET DEFAULT TRUE`;
    await sql`ALTER TABLE retalhos_estoque ALTER COLUMN descartado SET DEFAULT FALSE`;
    await sql`ALTER TABLE retalhos_estoque ALTER COLUMN created_at SET DEFAULT NOW()`;
    await sql`ALTER TABLE retalhos_estoque ALTER COLUMN updated_at SET DEFAULT NOW()`;
    await sql`ALTER TABLE retalhos_estoque ALTER COLUMN metadata SET DEFAULT '{}'::jsonb`;
    
    // Remover a constraint que está bloqueando se necessário
    // await sql`ALTER TABLE retalhos_estoque DROP CONSTRAINT IF EXISTS retalhos_estoque_origem_check`;
    
    console.log('Defaults sincronizados!');
  } catch (err: any) {
    console.error('ERRO:', err.message);
  }
}

syncDefaults().catch(console.error);
