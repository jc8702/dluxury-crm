require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
async function run() {
  try {
    const result = await sql`SELECT id, nome, slug, icone, created_at, updated_at FROM erp_categories ORDER BY nome ASC`;
    console.log('OK', result.length);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}
run();
