import 'dotenv/config';
import { sql } from './src/api-lib/_db.js';

async function checkSchema() {
  try {
    const tablesResult = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    const tables = tablesResult.map(t => t.table_name);
    console.log('--- Tables ---');
    console.log(tables.join(', '));

    const checkTable = async (tableName) => {
      if (tables.includes(tableName)) {
        const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ${tableName}`;
        console.log(`\n--- Columns in ${tableName} ---`);
        cols.forEach(c => console.log(`${c.column_name} (${c.data_type})`));
      } else {
        console.log(`\nTable ${tableName} does not exist.`);
      }
    };

    await checkTable('billings');
    await checkTable('fornecedores');
    await checkTable('engineering_modules');
    await checkTable('erp_materials');
    await checkTable('orcamentos');

  } catch (e) {
    console.error('Error during schema check:', e.message);
  }
  process.exit(0);
}

checkSchema();
