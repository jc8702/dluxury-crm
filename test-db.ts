import { sql } from './src/api-lib/_db.js';
async function run() {
  const res = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'erp_skus'`;
  console.log(res);
  process.exit(0);
}
run();
