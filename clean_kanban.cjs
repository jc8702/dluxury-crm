require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    const res = await sql`DELETE FROM kanban_items WHERE type = 'production' OR type = 'producao'`;
    console.log('Itens de kanban_items deletados:', res);
  } catch (err) {
    console.error('ERRO:', err);
  }
}

main();
