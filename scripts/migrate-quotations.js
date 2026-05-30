import { Pool } from '@neondatabase/serverless';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log('--- INICIANDO MIGRAÇÃO E CONSOLIDAÇÃO DE DADOS ---');
  try {
    await pool.query('BEGIN');

    // 1. Criar novas tabelas baseadas no schema das atuais
    console.log('Criando novas tabelas...');
    await pool.query(`CREATE TABLE IF NOT EXISTS quotations (LIKE orcamentos_pro INCLUDING ALL)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS quotation_items (LIKE orcamento_itens INCLUDING ALL)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS quotation_bom (LIKE orcamento_lista_explodida INCLUDING ALL)`);

    // 2. Ajustar as constraints de chave estrangeira nas novas tabelas
    console.log('Ajustando Foreign Keys...');
    // quotation_items -> quotations
    await pool.query(`ALTER TABLE quotation_items ADD CONSTRAINT fk_quotation_items_quotations FOREIGN KEY (orcamento_id) REFERENCES quotations(id) ON DELETE CASCADE`);
    // quotation_bom -> quotation_items
    await pool.query(`ALTER TABLE quotation_bom ADD CONSTRAINT fk_quotation_bom_items FOREIGN KEY (orcamento_item_id) REFERENCES quotation_items(id) ON DELETE CASCADE`);

    // 3. Migrar dados
    console.log('Copiando dados...');
    await pool.query(`INSERT INTO quotations SELECT * FROM orcamentos_pro ON CONFLICT DO NOTHING`);
    await pool.query(`INSERT INTO quotation_items SELECT * FROM orcamento_itens ON CONFLICT DO NOTHING`);
    // orcamento_lista_explodida estava vazia, mas por garantia:
    await pool.query(`INSERT INTO quotation_bom SELECT * FROM orcamento_lista_explodida ON CONFLICT DO NOTHING`);

    // 4. Renomear colunas FK para refletir o novo nome (orcamento_id -> quotation_id, etc)
    console.log('Renomeando colunas...');
    await pool.query(`ALTER TABLE quotation_items RENAME COLUMN orcamento_id TO quotation_id`);
    await pool.query(`ALTER TABLE quotation_bom RENAME COLUMN orcamento_item_id TO quotation_item_id`);

    // 5. Apagar tabelas vazias redundantes
    console.log('Removendo 6 tabelas redundantes vazias...');
    const tablesToDrop = [
      'orcamento_moveis',
      'orcamento_pecas',
      'orcamento_ferragens',
      'orcamento_ambientes',
      'orcamento_custos_extras'
      // 'orcamento_lista_explodida' - wait, we copied from it, we can drop it too
    ];
    for (const table of tablesToDrop) {
      await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
    await pool.query(`DROP TABLE IF EXISTS orcamento_lista_explodida CASCADE`);

    await pool.query('COMMIT');
    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ ERRO NA MIGRAÇÃO:', err);
  } finally {
    await pool.end();
  }
}

run();
