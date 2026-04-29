import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function check() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('No DATABASE_URL');
  
  const sql = neon(dbUrl);
  
  console.log('=== Descrevendo retalhos_estoque ===');
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'retalhos_estoque'
    `;
    console.log(JSON.stringify(columns, null, 2));
    
    const count = await sql`SELECT COUNT(*) FROM retalhos_estoque`;
    console.log('Total de registros:', count);
  } catch (err) {
    console.error('Erro ao acessar tabela:', err);
  }
}

check().catch(console.error);
