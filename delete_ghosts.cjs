require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const result = await sql`DELETE FROM materiais WHERE sku LIKE 'RET-%' AND sku NOT IN (SELECT sku FROM retalhos_estoque)`;
    console.log('Fantasmas deletados!');
  } catch (err) {
    console.error(err);
  }
}
run();
