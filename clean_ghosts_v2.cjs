require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const ghosts = await sql`
    SELECT m.id, m.sku 
    FROM materiais m
    LEFT JOIN retalhos_estoque r ON m.sku = r.sku
    WHERE m.sku LIKE 'RET-%' AND r.id IS NULL
  `;
  console.table(ghosts);

  if (ghosts.length > 0) {
    for (const g of ghosts) {
      await sql`DELETE FROM movimentacoes_estoque WHERE material_id = ${g.id}`;
      await sql`DELETE FROM materiais WHERE id = ${g.id}`;
    }
    console.log(`Limpou ${ghosts.length} fantasmas.`);
  } else {
    console.log('Nenhum fantasma encontrado por LEFT JOIN.');
  }
}
run();
