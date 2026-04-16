import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function check() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    console.log('--- Verificando Tabela Materiais ---');
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'materiais'
    `;
    console.log('Colunas encontradas:', cols.map(c => c.column_name).join(', '));

    console.log('\n--- Verificando Novas Tabelas ---');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const tableList = tables.map(t => t.table_name);
    console.log('Tabelas encontradas:', tableList.join(', '));

    const requiredTables = ['orcamento_ambientes', 'orcamento_moveis', 'orcamento_pecas', 'configuracoes_precificacao'];
    const missing = requiredTables.filter(t => !tableList.includes(t));
    
    if (missing.length > 0) {
      console.log('\n❌ Tabelas faltando:', missing.join(', '));
    } else {
      console.log('\n✅ Todas as tabelas técnicas existem.');
    }

  } catch (err) {
    console.error('Erro no diagnóstico:', err);
  }
}

check();
