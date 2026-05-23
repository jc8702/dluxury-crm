require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log('Atualizando materiais para MAIÚSCULO...');
  
  // Atualizar tabela de materiais
  await sql`UPDATE materiais SET nome = UPPER(nome) WHERE nome != UPPER(nome)`;
  await sql`UPDATE materiais SET descricao = UPPER(descricao) WHERE descricao IS NOT NULL AND descricao != UPPER(descricao)`;
  
  // Atualizar tabela de retalhos_estoque
  await sql`UPDATE retalhos_estoque SET observacoes = UPPER(observacoes) WHERE observacoes IS NOT NULL AND observacoes != UPPER(observacoes)`;
  await sql`UPDATE retalhos_estoque SET localizacao = UPPER(localizacao) WHERE localizacao IS NOT NULL AND localizacao != UPPER(localizacao)`;
  
  console.log('Atualização concluída com sucesso!');
}
run();
