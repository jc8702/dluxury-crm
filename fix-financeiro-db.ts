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
  try {
    // Como o arquivo tem BEGIN/COMMIT, executamos como uma única query se o driver permitir, 
    // ou limpamos os marcadores de transação para evitar conflitos se o driver já abrir uma.
    // O driver Neon permite multi-statements em alguns contextos.
    await sql.unsafe(sqlContent);
    console.log('--- Migração Financeira Concluída com Sucesso! ---');
  } catch (e) {
    console.error('Erro ao executar SQL:', e.message);
    
    // Fallback: Tentar executar linha por linha se falhar (removendo comentários e vazios)
    console.log('Tentando fallback: Execução fragmentada...');
    try {
        const commands = sqlContent
            .split(';')
            .map(c => c.trim())
            .filter(c => c && !c.startsWith('--') && c.toUpperCase() !== 'BEGIN' && c.toUpperCase() !== 'COMMIT');
        
        for (const cmd of commands) {
            console.log(`Executando: ${cmd.substring(0, 50)}...`);
            await sql.unsafe(cmd);
        }
        console.log('--- Migração Financeira Concluída (via Fallback)! ---');
    } catch (e2) {
        console.error('Falha total no fallback:', e2.message);
    }
  }
  process.exit(0);
}

runFix();
