import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : null;

if (!dbUrl) { process.exit(1); }
const sql = neon(dbUrl);

async function check() {
  console.log('=== Verificando dados inválidos ===');
  const invalid = await sql`
    SELECT id, objetivo FROM eventos 
    WHERE objetivo IS NOT NULL 
    AND objetivo NOT IN ('medicao', 'apresentacao', 'instalacao', 'pos_venda', 'outro')
    LIMIT 10
  `;
  console.log('Dados inválidos:', JSON.stringify(invalid, null, 2));

  console.log('\n=== Verificando NULLs ===');
  const nulls = await sql`
    SELECT COUNT(*) as total FROM eventos WHERE objetivo IS NULL
  `;
  console.log('Total NULLs:', nulls[0]);

  process.exit(0);
}
check();