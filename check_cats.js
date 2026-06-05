import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("=== Categoria Material (categorias_material) ===");
  const catsMat = await sql`SELECT * FROM categorias_material`;
  console.log(catsMat);

  console.log("\n=== ERP Categories (erp_categories) ===");
  const erpCats = await sql`SELECT * FROM erp_categories`;
  console.log(erpCats);

  console.log("\n=== SKU Componente (sku_componente) - Distinct Tipos ===");
  const skuCompTypes = await sql`SELECT DISTINCT tipo FROM sku_componente`;
  console.log(skuCompTypes);
}

main().catch(console.error);
