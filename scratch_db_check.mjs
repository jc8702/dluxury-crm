import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function check() {
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables:', tables.map(t => t.table_name).join(', '));
    
    // Check projects
    try {
      const pCount = await sql`SELECT count(*) FROM projects`;
      console.log('Projects count:', pCount[0].count);
    } catch (e) {
      console.log('Projects table does not exist or error:', e.message);
    }

    // Check kanban
    try {
      const kCount = await sql`SELECT count(*) FROM kanban`;
      console.log('Kanban count:', kCount[0].count);
    } catch (e) {
      console.log('Kanban table does not exist or error:', e.message);
    }

    // Check orcamentos projects
    try {
      const res = await sql`SELECT projeto_id, count(*) FROM orcamentos GROUP BY projeto_id`;
      console.log('Orcamentos projeto_id distribution:', JSON.stringify(res, null, 2));
    } catch (e) {
      console.log('Orcamentos error:', e.message);
    }

  } catch (err) {
    console.error('ERROR:', err);
  }
}

check();
