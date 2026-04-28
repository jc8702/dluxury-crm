
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function checkOrcamentos() {
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orcamentos'
    `;
    console.log('Columns in orcamentos table:', columns.map(c => c.column_name).join(', '));
  } catch (error) {
    console.error('Error checking orcamentos:', error);
  }
}

checkOrcamentos();
