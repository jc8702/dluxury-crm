import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

const sql = neon(connectionString);

async function dropLegacyTables() {
  console.log('Iniciando limpeza final do banco de dados (DROP de tabelas inativas)...');
  
  try {
    // Drop das tabelas legadas com CASCADE para limpar constraints associadas
    await sql`DROP TABLE IF EXISTS orcamentos CASCADE;`;
    console.log('✅ Tabela [orcamentos] deletada.');

    await sql`DROP TABLE IF EXISTS orcamentos_pro CASCADE;`;
    console.log('✅ Tabela [orcamentos_pro] deletada.');

    await sql`DROP TABLE IF EXISTS orcamento_itens CASCADE;`;
    console.log('✅ Tabela [orcamento_itens] deletada.');

    console.log('🎉 Limpeza concluída. O banco contém apenas as tabelas ativas do novo schema.');
  } catch (err) {
    console.error('❌ Erro durante o DROP:', err);
  }
}

dropLegacyTables();
