import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/DATABASE_URL="([^"]+)"/);
const url = urlMatch ? urlMatch[1] : null;

if (!url) throw new Error('No DB URL');

const sql = neon(url);

(async () => {
  // Verificar tabelas
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%project%'
  `;
  console.log('Tables:', tables.map(t => t.table_name));
  process.exit(0);
})();