require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log('Buscando materiais fantasmas...');
  const fantasmas = await sql`SELECT id, sku FROM materiais WHERE sku LIKE 'RET-%' AND sku NOT IN (SELECT sku FROM retalhos_estoque WHERE sku IS NOT NULL)`;
  console.log('Fantasmas encontrados:', fantasmas.length);
  for (const f of fantasmas) {
    await sql`DELETE FROM movimentacoes_estoque WHERE material_id = ${f.id}`;
    await sql`DELETE FROM materiais WHERE id = ${f.id}`;
  }
  console.log('Limpeza concluída!');
}
run();
