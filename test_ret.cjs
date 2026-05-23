require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const ret = await sql`SELECT id, sku, descartado, disponivel FROM retalhos_estoque WHERE sku LIKE 'RET-%'`;
  console.table(ret);
}
run();
