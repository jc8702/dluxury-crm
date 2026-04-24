
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
const sql = neon(process.env.DATABASE_URL);
async function main() {
  const columns = await sql`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('clients', 'projects', 'users') AND column_name = 'id'`;
  console.log(columns);
  process.exit(0);
}
main();
