import { db } from './src/api-lib/drizzle-db.js';
import { sql } from 'drizzle-orm';

async function test() {
  try {
    await db.execute(sql`DROP TABLE IF EXISTS orcamento_lista_explodida CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS orcamento_custos_extras CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS orcamento_ambientes CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS orcamento_ferragens CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS orcamento_pecas CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS orcamento_moveis CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS orcamento_items CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS orcamentos_pro CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS orcamentos CASCADE;`);
    console.log('Todas as tabelas redundantes foram deletadas com sucesso.');
  } catch(e) {
    console.error('Erro ao deletar tabelas:', e);
  }
  process.exit(0);
}

test();
