import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/DATABASE_URL="([^"]+)"/);
const url = urlMatch ? urlMatch[1] : null;

if (!url) throw new Error('No DB URL');

const sql = neon(url);

(async () => {
  // Query simples SEM JOINS para evitar erro
  const evts = await sql`
    SELECT * FROM eventos ORDER BY data_inicio DESC LIMIT 3
  `;
  console.log('Eventos (sem join):', JSON.stringify(evts, null, 2));
  process.exit(0);
})();