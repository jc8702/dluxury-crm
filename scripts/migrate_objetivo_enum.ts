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

async function migrate() {
  console.log('=== MIGRAÇÃO DEFINITIVA ===\n');
  
  try {
    console.log('1. Verificando se ENUM existe...');
    const enumExists = await sql`
      SELECT 1 FROM pg_type WHERE typname = 'objetivo_evento_enum'
    `;
    
    if (enumExists.length === 0) {
      console.log('   Criando ENUM tipo_objetivo...');
      await sql`CREATE TYPE tipo_objetivo AS ENUM ('medicao', 'apresentacao', 'instalacao', 'pos_venda', 'outro')`;
      console.log('   OK');
    } else {
      console.log('   ENUM já existe');
    }

    console.log('\n2. Removendo constraint antiga...');
    await sql`ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_objetivo_check`;
    console.log('   OK');

    console.log('\n3. Alterando coluna para usar ENUM...');
    await sql`
      ALTER TABLE eventos 
      ALTER COLUMN objetivo DROP DEFAULT,
      ALTER COLUMN objetivo TYPE tipo_objetivo USING objetivo::tipo_objetivo
    `;
    console.log('   OK');

    console.log('\n4. Verificando resultado...');
    const col = await sql`
      SELECT data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'eventos' AND column_name = 'objetivo'
    `;
    console.log('   Column objetivo:', col[0]);

    console.log('\n5. Verificando constraints...');
    const constraints = await sql`
      SELECT conname FROM pg_constraint 
      WHERE conname = 'eventos_objetivo_check'
    `;
    if (constraints.length === 0) {
      console.log('   Constraint antigo removido!');
    }

    console.log('\n=== MIGRAÇÃO CONCLUÍDA ===');
    process.exit(0);
  } catch (e: any) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
}

migrate();