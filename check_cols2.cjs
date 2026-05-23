require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
async function run() {
  const result = await sql`SELECT * FROM categorias_material LIMIT 1`;
  console.log(result);
}
run();
