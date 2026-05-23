require('dotenv').config();
const { sql } = require('./src/db/neon.cjs');
async function run() {
  try {
    const r = await sql`SELECT id, nome, slug, icone, created_at, updated_at FROM erp_categories ORDER BY nome ASC`;
    console.table(r);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
}
run();
