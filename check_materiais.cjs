require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    const cols = await sql`SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'materiais'`;
    console.table(cols);

    // Tentando inserir um retalho falso pra ver o erro
    console.log("Tentando inserir um retalho...");
    const res = await sql`
        INSERT INTO materiais (sku, nome, descricao, unidade_compra, unidade_uso, fator_conversao, estoque_atual, ativo, largura_mm, altura_mm)
        VALUES ('RET-9999', 'Retalho Teste', 'Sobra de Plano de Corte Automática', 'UN', 'UN', 1, 1, true, 500, 500)
        RETURNING id
    `;
    console.log("Inserido com sucesso:", res);
    
    await sql`DELETE FROM materiais WHERE sku = 'RET-9999'`;
  } catch (e) {
    console.error("ERRO AO INSERIR:", e.message);
  }
}
main();
