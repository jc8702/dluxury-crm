import 'dotenv/config';
import { sql } from './src/api-lib/_db.ts';
import fs from 'fs';
import path from 'path';

async function runFix() {
  const sqlPath = path.join(process.cwd(), 'migrations', '20260420_create_financeiro.sql');
  console.log(`Lendo arquivo SQL: ${sqlPath}`);
  
  if (!fs.existsSync(sqlPath)) {
    console.error('Arquivo não encontrado!');
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('Executando comandos SQL no Neon...');
  
  const commands = sqlContent
    .split(';')
    .map(c => c.trim())
    .filter(c => c && !c.startsWith('--') && c.toUpperCase() !== 'BEGIN' && c.toUpperCase() !== 'COMMIT');

  for (const cmd of commands) {
    try {
      console.log(`Executando (${cmd.length} chars): ${cmd.substring(0, 50)}...`);
      // O driver neon @neondatabase/serverless aceita strings simples como única chamada
      await (sql as any)(cmd);
    } catch (e) {
      console.error(`Erro ao executar comando: ${e.message}`);
    }
  }
  
  console.log('--- Processo de correção finalizado. ---');
  process.exit(0);
}

runFix();
