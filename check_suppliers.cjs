require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const sups = await sql`
      SELECT id, nome, cnpj, contato, telefone, email, ativo 
      FROM fornecedores;
    `;
    console.table(sups);
  } catch (error) {
    console.error("Erro:", error);
  }
}

run();
