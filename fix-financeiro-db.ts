import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

async function runFix() {
  const dbUrl = process.env.DATABASE_URL || '';
  const sqlPath = path.join(process.cwd(), 'migrations', '20260420_create_financeiro.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  const sql = neon(dbUrl);
  
  // Remove comentários (linha a linha)
  const lines = sqlContent.split('\n');
  const cleanSql = lines
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
    
  // Dividimos por ;
  const commands = cleanSql
    .split(';')
    .map(c => c.trim())
    .filter(c => c && c.toUpperCase() !== 'BEGIN' && c.toUpperCase() !== 'COMMIT');

  console.log(`Iniciando execução de ${commands.length} comandos.`);
  
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    try {
      console.log(`[${i+1}/${commands.length}] Executando: ${cmd.substring(0, 50)}...`);
      // O cliente neon requer .query() para strings normais (não template literals)
      await (sql as any).query(cmd);
      console.log('OK');
    } catch (e) {
      console.error(`ERRO no comando ${i+1}: ${e.message}`);
    }
  }
  process.exit(0);
}

runFix().catch(console.error);
