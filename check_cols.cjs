require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'materiais'`;
  console.table(cols);
}
run();
