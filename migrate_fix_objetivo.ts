import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : null;

if (!dbUrl) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const sql = neon(dbUrl);

async function migrate() {
  console.log('Correcting eventos constraint...');
  try {
    await sql`
      ALTER TABLE eventos 
      DROP CONSTRAINT IF EXISTS eventos_objetivo_check
    `;
    console.log('Old constraint dropped.');
    
    await sql`
      ALTER TABLE eventos 
      ALTER COLUMN objetivo SET DEFAULT 'outro',
      ADD CONSTRAINT eventos_objetivo_check 
      CHECK (objetivo IN ('apresentacao', 'medicao', 'instalacao', 'pos_venda', 'outro') OR objetivo IS NULL)
    `;
    console.log('New constraint applied.');
    
    console.log('Migração concluída!');
    process.exit(0);
  } catch (e) {
    console.error('Erro:', e);
    process.exit(1);
  }
}

migrate();