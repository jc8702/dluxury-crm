import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const sql = neon(process.env.DATABASE_URL!);

async function check() {
  const rows = await sql`SELECT count(*) as count, tenant_id FROM quotations GROUP BY tenant_id`;
  console.log('Quotations:', rows);
  
  const sample = await sql`SELECT id, numero_orcamento, tenant_id FROM quotations LIMIT 1`;
  console.log('Sample:', sample);
}
check().catch(console.error);
