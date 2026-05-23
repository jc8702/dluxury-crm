require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const result = await sql`
      SELECT id, nome, cnpj, contato, telefone, email, cidade, estado, observacoes, ativo, created_at, updated_at 
      FROM fornecedores 
      WHERE ativo = true 
      ORDER BY nome ASC;
    `;
    console.log("Sucesso:", result.length);
  } catch (error) {
    console.error("Erro na query de fornecedores:", error.message);
  }
}

run();
