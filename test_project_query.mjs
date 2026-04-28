
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function testProjectQuery() {
  try {
    const result = await sql`
      SELECT 
        p.*, 
        COALESCE(p.client_name, p.cliente_nome) as client_name,
        COALESCE(p.cliente_nome, p.client_name) as cliente_nome,
        COALESCE(p.ambiente, p.title, p.titulo) as ambiente,
        COALESCE(p.title, p.ambiente) as title,
        o.valor_final as valor_orcamento_atual
      FROM projects p
      LEFT JOIN (
        SELECT DISTINCT ON (projeto_id) valor_final, projeto_id
        FROM orcamentos
        ORDER BY projeto_id, created_at DESC
      ) o ON p.id::text = o.projeto_id::text
      ORDER BY p.updated_at DESC
    `;
    console.log('Query successful! Projects returned:', result.length);
  } catch (error) {
    console.error('Query failed:', error);
  }
}

testProjectQuery();
