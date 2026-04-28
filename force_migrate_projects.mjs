import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  try {
    console.log('--- Starting Forced Migration ---');
    
    // 1. Check current counts
    const pCount = await sql`SELECT count(*) FROM projects`;
    const kiCount = await sql`SELECT count(*) FROM kanban_items WHERE type = 'project' OR type IS NULL`;
    
    console.log(`Current Projects: ${pCount[0].count}`);
    console.log(`Kanban Items (Potential Projects): ${kiCount[0].count}`);

    // 2. Perform migration
    const result = await sql`
      INSERT INTO projects (client_name, cliente_nome, ambiente, title, status, observations, created_at, updated_at)
      SELECT 
        subtitle as client_name, 
        subtitle as cliente_nome,
        title as ambiente,
        title as title,
        status, 
        observations, 
        COALESCE(updated_at, NOW()), 
        NOW()
      FROM kanban_items ki
      WHERE (ki.type = 'project' OR ki.type IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.ambiente = ki.title 
        AND (p.client_name = ki.subtitle OR p.client_name = ki.contact_name)
      )
      RETURNING id
    `;

    console.log(`Migrated ${result.length} items.`);

    // 3. Final count
    const pCountFinal = await sql`SELECT count(*) FROM projects`;
    console.log(`Final Projects count: ${pCountFinal[0].count}`);

    process.exit(0);
  } catch (err) {
    console.error('MIGRATION ERROR:', err);
    process.exit(1);
  }
}

migrate();
