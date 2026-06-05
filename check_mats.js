import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("=== Materiais (first 10) ===");
  const mats = await sql`SELECT m.id, m.sku, m.nome, m.preco_custo, m.categoria_id, c.nome as cat_nome 
                         FROM materiais m 
                         LEFT JOIN erp_categories c ON m.categoria_id = c.id
                         LIMIT 10`;
  console.log(mats);

  console.log("\n=== Count of materiais by categoria_id ===");
  const matsCounts = await sql`SELECT categoria_id, count(*) FROM materiais GROUP BY categoria_id`;
  console.log(matsCounts);

  console.log("\n=== SKU Componente (first 10) ===");
  const comps = await sql`SELECT id, codigo, nome, tipo, preco_unitario FROM sku_componente LIMIT 10`;
  console.log(comps);
}

main().catch(console.error);
