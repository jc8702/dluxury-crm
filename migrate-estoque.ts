import { sql } from './src/api-lib/_db.js';

async function run() {
  try {
    await sql`ALTER TABLE estoque_materiais_detalhado ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE estoque_materiais_detalhado ADD COLUMN IF NOT EXISTS fabricante VARCHAR(255)`;
    await sql`ALTER TABLE estoque_materiais_detalhado ADD COLUMN IF NOT EXISTS fornecedor_principal VARCHAR(255)`;
    await sql`ALTER TABLE estoque_materiais_detalhado ADD COLUMN IF NOT EXISTS categoria_taxonomia VARCHAR(100)`;
    await sql`ALTER TABLE estoque_materiais_detalhado ADD COLUMN IF NOT EXISTS preco_custo NUMERIC`;
    await sql`ALTER TABLE estoque_materiais_detalhado ADD COLUMN IF NOT EXISTS unidade_uso VARCHAR(50)`;
    console.log("Migration for estoque_materiais_detalhado successful");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
