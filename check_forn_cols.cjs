require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fornecedores';
    `;
    console.table(cols);
  } catch (error) {
    console.error("Erro:", error);
  }
}

run();
