import 'dotenv/config';
import { sql } from './src/api-lib/_db.js';

async function checkEngineeringSchema() {
  try {
    const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'erp_product_bom'`;
    console.log(`\n--- Columns in erp_product_bom ---`);
    cols.forEach(c => console.log(`${c.column_name} (${c.data_type})`));

    const checkExtra = async (tableName) => {
        const res = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = ${tableName}`;
        if (res.length > 0) {
            const c = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${tableName}`;
            console.log(`\n--- Columns in ${tableName} ---`);
            console.log(c.map(i => i.column_name).join(', '));
        } else {
            console.log(`\nTable ${tableName} missing.`);
        }
    }

    await checkExtra('orcamento_ambientes');
    await checkExtra('orcamento_moveis');
    await checkExtra('orcamento_pecas');

  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

checkEngineeringSchema();
