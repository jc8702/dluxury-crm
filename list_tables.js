import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("Fetching tables...");
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`;
  console.log("Tables:");
  for (const row of tables) {
    console.log("- " + row.table_name);
  }
}

main().catch(console.error);
