import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import fs from 'fs';

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const sql = fs.readFileSync('./src/db/migrations/phase6_budget_pro.sql', 'utf8');
    console.log('Executando migração Phase 6...');
    await pool.query(sql);
    console.log('✅ Sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await pool.end();
  }
}

run();
