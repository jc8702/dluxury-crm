import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const databaseUrl = process.env.DATABASE_URL?.replace(/"/g, '') || '';

async function migrate() {
  try {
    console.log('--- Aplicando Migration Manual ---');
    if (!databaseUrl) throw new Error('DATABASE_URL não encontrada.');
    
    const client = neon(databaseUrl);
    const sqlContent = fs.readFileSync('./drizzle/0000_fast_whistler.sql', 'utf8');
    const statements = sqlContent.split('--> statement-breakpoint');

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executando statement...');
        await client.query(statement);
      }
    }
    console.log('Migration aplicada com sucesso!');
  } catch (e) {
    console.error('Erro na migration:', e.message);
  }
  process.exit(0);
}

migrate();
