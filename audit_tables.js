import { Pool } from '@neondatabase/serverless';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const targetTables = [
    'orcamentos',
    'orcamentos_pro',
    'orcamento_itens',
    'itens_orcamento',
    'orcamento_moveis',
    'orcamento_pecas',
    'orcamento_ferragens',
    'orcamento_ambientes',
    'orcamento_custos_extras',
    'orcamento_lista_explodida'
  ];

  console.log("--- AUDITORIA DE TABELAS DE ORÇAMENTO ---");
  for (const table of targetTables) {
    try {
      const res = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
      console.log(`\nTABELA: ${table} | REGISTROS: ${res.rows[0].count}`);
      
      const resRow = await pool.query(`SELECT * FROM "${table}" LIMIT 1`);
      if (resRow.rows.length > 0) {
        console.log(`  COLUNAS: ${Object.keys(resRow.rows[0]).join(', ')}`);
      } else {
        // Fetch columns from information_schema
        const colRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]);
        console.log(`  COLUNAS (vazia): ${colRes.rows.map(r => r.column_name).join(', ')}`);
      }
    } catch(e) {
      console.log(`TABELA: ${table} | ERRO: ${e.message}`);
    }
  }
  
  await pool.end();
}
main().catch(console.error);
