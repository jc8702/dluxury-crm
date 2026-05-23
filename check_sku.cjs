require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    const result = await sql`
        SELECT COALESCE(MAX(CAST(SUBSTRING(sku, 5) AS INTEGER)), 0) + 1 AS prox
        FROM retalhos_estoque
        WHERE sku ~ '^RET-[0-9]+$'
    `;
    console.log(result);
  } catch (e) {
    console.error("ERRO:", e);
  }
}
main();
