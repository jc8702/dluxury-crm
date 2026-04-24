import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/DATABASE_URL="([^"]+)"/);
const url = urlMatch ? urlMatch[1] : null;

if (!url) throw new Error('No DB URL');

const sql = neon(url);

(async () => {
  // Ver estrutura da tabela projects
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'projects'
  `;
  console.log('projects columns:', cols.map(c => c.column_name));
  
  // Testar query SIMPLES sem LEFT JOIN problemáticos
  const evts = await sql`
    SELECT * FROM eventos ORDER BY data_inicio DESC LIMIT 5
  `;
  console.log('\nEventos:', evts.length);
  if (evts[0]) {
    console.log('Keys do primeiro:', Object.keys(evts[0]));
  }
  process.exit(0);
})();