import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const brdMats = await sql`SELECT id, sku, nome, preco_custo, categoria_id FROM materiais WHERE categoria_id = 'BRD'`;
  console.log(brdMats);
}

main().catch(console.error);
