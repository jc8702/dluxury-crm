import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/DATABASE_URL="([^"]+)"/);
const url = urlMatch ? urlMatch[1] : null;

if (!url) throw new Error('No DB URL');

const sql = neon(url);

(async () => {
  const evts = await sql`
    SELECT id, tipo, titulo, objetivo, data_inicio 
    FROM eventos 
    ORDER BY criado_em DESC 
    LIMIT 5
  `;
  console.log('Eventos recentes:', JSON.stringify(evts, null, 2));
  process.exit(0);
})();