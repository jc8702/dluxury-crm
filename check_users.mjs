import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const r = await sql`SELECT id, name, email, role FROM users`;
  console.log('USERS:', JSON.stringify(r, null, 2));
}

main().catch(console.error);