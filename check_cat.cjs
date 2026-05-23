require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
async function run() {
  const result = await sql`SELECT sku, nome, categoria_id FROM materiais LIMIT 5`;
  console.table(result);
}
run();
