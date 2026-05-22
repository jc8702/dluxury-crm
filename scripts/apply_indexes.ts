import 'dotenv/config';
import { db } from '../src/api-lib/drizzle-db.js';
import { sql } from 'drizzle-orm';

async function applyIndexes() {
  console.log('--- APLICANDO ÍNDICES DE PERFORMANCE NO NEON POSTGRES ---');
  if (!db) {
    console.error('Erro: DATABASE_URL não definida ou instância db nula.');
    process.exit(1);
  }

  const queries = [
    // Índices para orcamentos_pro
    `CREATE INDEX IF NOT EXISTS idx_orcamentos_numero ON orcamentos_pro (numero_orcamento);`,
    `CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente ON orcamentos_pro (cliente_id);`,
    `CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos_pro (status);`,
    `CREATE INDEX IF NOT EXISTS idx_orcamentos_data ON orcamentos_pro (data_orcamento);`,

    // Índices para orcamento_itens
    `CREATE INDEX IF NOT EXISTS idx_orc_itens_orcamento ON orcamento_itens (orcamento_id);`,
    `CREATE INDEX IF NOT EXISTS idx_orc_itens_sku_eng ON orcamento_itens (sku_engenharia_id);`,
    `CREATE INDEX IF NOT EXISTS idx_orc_itens_sku_comp ON orcamento_itens (sku_componente_id);`,

    // Índices para orcamento_lista_explodida
    `CREATE INDEX IF NOT EXISTS idx_lista_explodida_item ON orcamento_lista_explodida (orcamento_item_id);`,
    `CREATE INDEX IF NOT EXISTS idx_lista_explodida_sku ON orcamento_lista_explodida (sku_componente_id);`
  ];

  for (const q of queries) {
    try {
      console.log(`Executando: ${q}`);
      await db.execute(sql.raw(q));
      console.log('✅ Sucesso!');
    } catch (err: any) {
      console.error(`❌ Erro ao executar "${q}":`, err.message);
    }
  }

  console.log('--- APLICAÇÃO DE ÍNDICES CONCLUÍDA ---');
}

applyIndexes().catch(console.error);
