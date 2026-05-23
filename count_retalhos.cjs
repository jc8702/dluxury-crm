require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    const res = await sql`SELECT COUNT(*) FROM retalhos_estoque`;
    console.log("retalhos_estoque:", res);
    const res2 = await sql`SELECT COUNT(*) FROM materiais WHERE sku LIKE 'RET%'`;
    console.log("materiais (RET%):", res2);
  } catch (e) {
    console.error("ERRO:", e);
  }
}
main();
