import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import fs from 'fs';

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  let out = 'TABLES:\n';
  for (const t of tables) {
    out += `- ${t.table_name}\n`;
  }

  const columns = await sql`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;
  out += '\nCOLUMNS:\n';
  let currentTable = '';
  for (const c of columns) {
    if (c.table_name !== currentTable) {
      out += `\nTable: ${c.table_name}\n`;
      currentTable = c.table_name;
    }
    out += `  ${c.column_name} (${c.data_type})\n`;
  }

  fs.writeFileSync('db_schema.txt', out);
  console.log('Schema written to db_schema.txt');
}

run().catch(console.error);
