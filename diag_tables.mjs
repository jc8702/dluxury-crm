
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function checkTables() {
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables:', tables.map(t => t.table_name).join(', '));
    
    // Check if visits/calendar tables already exist
    const specific = await sql`SELECT table_name FROM information_schema.tables WHERE table_name IN ('visitas', 'calendario', 'eventos')`;
    console.log('Existing related tables:', specific.map(t => t.table_name));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkTables();
