import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function checkTables() {
  console.log('=== Verificando Banco de Dados ===\n');
  
  // Listar todas as tabelas
  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  console.log('Tabelas encontradas:', tables.length);
  
  // Contagem de registros importantes
  try {
    const counts = await sql`
      SELECT 
        'clients' as name, COUNT(*) as count FROM clients
      UNION ALL
      SELECT 'fornecedores', COUNT(*) FROM fornecedores
      UNION ALL
      SELECT 'materiais', COUNT(*) FROM materiais
      UNION ALL
      SELECT 'erp_skus', COUNT(*) FROM erp_skus
      UNION ALL
      SELECT 'orcamentos', COUNT(*) FROM orcamentos
      UNION ALL
      SELECT 'eventos', COUNT(*) FROM eventos
      UNION ALL
      SELECT 'users', COUNT(*) FROM users
    `;
    
    console.log('\n=== Registros por Tabela ===');
    counts.forEach(c => {
      console.log(`${c.name}: ${c.count}`);
    });
  } catch (e) {
    console.log('Erro ao contar algumas tabelas:', e.message);
  }
}

checkTables().catch(console.error);