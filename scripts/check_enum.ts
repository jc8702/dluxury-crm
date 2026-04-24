import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : null;

if (!dbUrl) { process.exit(1); }
const sql = neon(dbUrl);

async function check() {
  const values = await sql`SELECT unnest(enum_range(NULL::tipo_objetivo)) as value`;
  console.log('ENUM values:', values.map(v => v.value));
  process.exit(0);
}
check();