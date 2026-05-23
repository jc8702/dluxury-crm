require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
async function run() {
  const result = await sql`SELECT id, sku, nome, categoria_id FROM materiais WHERE sku NOT LIKE 'RET%' LIMIT 5`;
  console.log(result);
}
run();
