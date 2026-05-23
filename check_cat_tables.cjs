require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
async function run() {
  const result = await sql`SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%categor%'`;
  console.log(result);
}
run();
