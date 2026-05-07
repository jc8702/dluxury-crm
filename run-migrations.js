import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import fs from 'fs';

async function runMigration() {
  console.log('--- EXECUTANDO MIGRAÇÕES MANUAIS (via Pool) ---');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const migration1 = fs.readFileSync('./src/db/migrations/phase5_indexes_and_constraints.sql', 'utf8');
    const migration2 = fs.readFileSync('./src/db/migrations/phase5_industrial_stock.sql', 'utf8');

    console.log('Executando Fase 5.1...');
    await pool.query(migration1);
    
    console.log('Executando Industrial Stock...');
    await pool.query(migration2);

    console.log('✅ Migrações concluídas com sucesso!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migração:', err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
