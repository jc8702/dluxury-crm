import 'dotenv/config';
import { db } from './src/api-lib/drizzle-db.js';
import { sql } from './src/api-lib/_db.js';
import fs from 'fs';

async function runMigration() {
  console.log('--- EXECUTANDO MIGRAÇÕES MANUAIS ---');
  try {
    const migration1 = fs.readFileSync('./src/db/migrations/phase5_indexes_and_constraints.sql', 'utf8');
    const migration2 = fs.readFileSync('./src/db/migrations/phase5_industrial_stock.sql', 'utf8');

    console.log('Executando Fase 5.1...');
    await sql(migration1);
    
    console.log('Executando Industrial Stock...');
    await sql(migration2);

    console.log('✅ Migrações concluídas com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migração:', err);
    process.exit(1);
  }
}

runMigration();
