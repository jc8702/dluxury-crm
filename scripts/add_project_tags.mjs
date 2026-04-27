
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  try {
    console.log('Adicionando coluna "tag" à tabela kanban_items...');
    await sql`ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS tag TEXT UNIQUE`;
    
    console.log('Gerando tags para projetos existentes...');
    // Apenas 'type' existe no schema de kanban_items
    const projects = await sql`SELECT id FROM kanban_items WHERE LOWER(type) = 'project'`;
    
    for (const p of projects) {
      const tag = `PRJ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await sql`UPDATE kanban_items SET tag = ${tag} WHERE id = ${p.id} AND tag IS NULL`;
    }
    
    console.log('Migração concluída com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err.message);
  }
}

migrate();
