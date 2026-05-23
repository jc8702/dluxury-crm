require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const columns = await sql`
    SELECT column_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'movimentacoes_estoque'
  `;
  console.table(columns);
}
run();
