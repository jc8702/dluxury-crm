import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function check() {
  try {
    const res1 = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orcamentos'
    `;
    console.log('orcamentos:', res1.map((r: any) => `${r.column_name} (${r.data_type})`).join(', '));
    
    const res2 = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orcamentos_pro'
    `;
    console.log('orcamentos_pro:', res2.map((r: any) => `${r.column_name} (${r.data_type})`).join(', '));
    
    const res3 = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients'
    `;
    console.log('clients:', res3.map((r: any) => `${r.column_name} (${r.data_type})`).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
