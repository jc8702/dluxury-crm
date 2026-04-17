import { sql } from './src/api-lib/_db.js';

async function run() {
  const mov = await sql`DELETE FROM movimentacoes_estoque WHERE material_id IN (SELECT id FROM materiais WHERE categoria_id NOT IN ('CHP', 'BRD', 'FRG', 'FIX', 'INS', 'ILU', 'ACS', 'EST'))`;
  console.log('Movimentações deletadas:', mov.count);
  const r = await sql`DELETE FROM materiais WHERE categoria_id NOT IN ('CHP', 'BRD', 'FRG', 'FIX', 'INS', 'ILU', 'ACS', 'EST')`;
  console.log('Deletados:', r.count);
  process.exit(0);
}

run().catch(console.error);
