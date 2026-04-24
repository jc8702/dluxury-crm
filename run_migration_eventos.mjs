
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('Iniciando migração de Eventos...');
    
    // Instead of hardcoding, let's try to split the migration_eventos_v2.sql more smartly.
    // We split by ';' but carefully handle the $$ blocks for functions.
    const migrationSql = fs.readFileSync('migration_eventos_v2.sql', 'utf8');
    
    // Simple parser for PostgreSQL scripts with $$ blocks
    const commands = [];
    let currentCommand = '';
    let inDollarBlock = false;
    
    const lines = migrationSql.split('\n');
    for (let line of lines) {
      // Ignore comments and empty lines
      if (line.trim().startsWith('--') || line.trim() === '') continue;
      
      if (line.includes('$$')) {
        inDollarBlock = !inDollarBlock;
      }
      
      currentCommand += line + '\n';
      
      if (!inDollarBlock && line.trim().endsWith(';')) {
        commands.push(currentCommand.trim());
        currentCommand = '';
      }
    }
    
    for (const cmd of commands) {
      console.log('Executando comando...');
      await sql.query(cmd);
    }
    
    console.log('Migração concluída com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
