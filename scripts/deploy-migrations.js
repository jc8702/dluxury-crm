import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import fs from 'fs';

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is missing');
  
  const pool = new Pool({ connectionString: dbUrl });
  
  const migration1 = fs.readFileSync('./src/db/migrations/phase5_indexes_and_constraints.sql', 'utf8');
  const migration2 = fs.readFileSync('./src/db/migrations/phase5_industrial_stock.sql', 'utf8');

  console.log('--- EXECUTANDO MIGRAÇÕES NEON (POOL) ---');
  
  try {
    console.log('Fase 5.1...');
    await pool.query(migration1); 
    console.log('Industrial Stock...');
    await pool.query(migration2);
    console.log('✅ SUCESSO');
  } catch (err) {
    console.error('❌ ERRO:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
