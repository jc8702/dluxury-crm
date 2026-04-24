import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : null;

if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(dbUrl);

async function check() {
  console.log('=== Verificando constraint ===');
  
  const constraints = await sql`
    SELECT conname, pg_get_constraintdef(oid) as def 
    FROM pg_constraint 
    WHERE conname LIKE '%objetivo%'
  `;
  console.log('Constraints:', JSON.stringify(constraints, null, 2));

  console.log('\n=== Verificando column definition ===');
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'eventos' AND column_name = 'objetivo'
  `;
  console.log('Column:', JSON.stringify(cols, null, 2));

  console.log('\n=== Verificando valores atuais ===');
  const values = await sql`
    SELECT DISTINCT objetivo FROM eventos WHERE objetivo IS NOT NULL LIMIT 20
  `;
  console.log('Valores actuales:', JSON.stringify(values, null, 2));
  
  process.exit(0);
}

check();