import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function check() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('No DATABASE_URL');
  
  const sql = neon(dbUrl);
  
  console.log('=== Verificando Tabelas ===');
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;
  console.log('Tabelas encontradas:', tables.map(t => t.table_name));

  const hasRetalhos = tables.some(t => t.table_name === 'retalhos_estoque');
  console.log('Tabela retalhos_estoque existe?', hasRetalhos);

  if (hasRetalhos) {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'retalhos_estoque'
    `;
    console.log('Colunas de retalhos_estoque:', columns);
  }
}

check().catch(console.error);
