import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/DATABASE_URL="([^"]+)"/);
const url = urlMatch ? urlMatch[1] : null;

if (!url) throw new Error('No DB URL');

const sql = neon(url);

(async () => {
  // Testar query EXATA que o repository usa
  const evts = await sql`
    SELECT e.*, 
           c.nome as cliente_nome,
           c.telefone as cliente_telefone,
           p.nome as projeto_nome,
           u.name as responsavel_nome
    FROM eventos e
    LEFT JOIN clients c ON e.cliente_id::TEXT = c.id::TEXT
    LEFT JOIN projects p ON e.projeto_id::TEXT = p.id::TEXT
    LEFT JOIN users u ON e.responsavel_id::TEXT = u.id::TEXT
    ORDER BY e.data_inicio ASC
    LIMIT 10
  `;
  
  console.log('TOTAL eventos:', evts.length);
  console.log('Primeiro evento:', JSON.stringify(evts[0], null, 2));
  process.exit(0);
})();