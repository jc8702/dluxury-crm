import 'dotenv/config';
import { sql } from './src/api-lib/_db.ts';

async function verify() {
  try {
    const res = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'classes_financeiras'`;
    console.log('Result for classes_financeiras:', JSON.stringify(res));
    
    const all = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('All tables count:', all.length);
    console.log('Tables:', all.map(t => t.table_name).join(', '));
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

verify();
