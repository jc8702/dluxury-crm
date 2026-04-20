import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  const tables = [
    'classes_financeiras', 'contas_internas', 'formas_pagamento',
    'titulos_receber', 'titulos_pagar', 'movimentacoes_tesouraria',
    'baixas', 'contas_recorrentes'
  ];

  console.log('Adicionando colunas de soft-delete...');
  
  for (const table of tables) {
    try {
      console.log(`Table: ${table}`);
      await (sql as any).query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT FALSE`);
      await (sql as any).query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP`);
      console.log('OK');
    } catch (e) {
      console.error(`Erro em ${table}:`, e.message);
    }
  }
  process.exit(0);
}

run();
