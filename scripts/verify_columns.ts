import 'dotenv/config';
import { sql } from '../src/api-lib/_db.js';

async function main() {
  const res = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'retalhos_estoque'`;
  console.log('Colunas encontradas:', res.map((r: any) => r.column_name));
  process.exit(0);
}
main();
