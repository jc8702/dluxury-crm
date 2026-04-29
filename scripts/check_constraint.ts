import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function check() {
  const dbUrl = process.env.DATABASE_URL;
  const sql = neon(dbUrl);
  
  const result = await sql`SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'retalhos_estoque_origem_check'`;
  console.log(result);
}

check().catch(console.error);
