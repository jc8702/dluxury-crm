import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/DATABASE_URL="([^"]+)"/);
const url = urlMatch ? urlMatch[1] : null;

if (!url) throw new Error('No DB URL');

const sql = neon(url);

(async () => {
  // Ver todos os campos
  const evts = await sql`
    SELECT id, tipo, titulo, objetivo, status_visita, data_inicio, data_fim 
    FROM eventos 
    ORDER BY criado_em DESC 
    LIMIT 3
  `;
  console.log('Eventos com status_visita:', JSON.stringify(evts, null, 2));
  
  const columnInfo = await sql`
    SELECT column_name, is_nullable, column_default, data_type
    FROM information_schema.columns 
    WHERE table_name = 'eventos' AND column_name IN ('status_visita', 'objetivo')
  `;
  console.log('Columns:', JSON.stringify(columnInfo, null, 2));
  
  process.exit(0);
})();