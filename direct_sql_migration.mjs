
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  const tables = [
    ['orcamentos', 'criado_em', 'created_at'],
    ['orcamentos', 'atualizado_em', 'updated_at'],
    ['orcamento_ambientes', 'criado_em', 'created_at'],
    ['orcamento_moveis', 'criado_em', 'created_at'],
    ['orcamento_pecas', 'criado_em', 'created_at'],
    ['orcamento_ferragens', 'criado_em', 'created_at'],
    ['orcamento_custos_extras', 'criado_em', 'created_at'],
    ['chamados_garantia', 'criado_em', 'created_at'],
    ['chamados_garantia', 'atualizado_em', 'updated_at'],
    ['notificacoes', 'criado_em', 'created_at'],
    ['eventos', 'criado_em', 'created_at'],
    ['eventos', 'atualizado_em', 'updated_at'],
    ['planos_de_corte', 'criado_em', 'created_at'],
    ['planos_de_corte', 'atualizado_em', 'updated_at'],
    ['retalhos_estoque', 'criado_em', 'created_at'],
    ['retalhos_estoque', 'atualizado_em', 'updated_at']
  ];

  for (const [table, oldCol, newCol] of tables) {
    try {
      // Usando template literal para comandos DDL
      await sql([`ALTER TABLE ${table} RENAME COLUMN ${oldCol} TO ${newCol}`]);
      console.log(`Renamed ${table}.${oldCol} to ${newCol}`);
    } catch (e) {
      // console.log(`Skipped ${table}.${oldCol}: ${e.message}`);
    }
  }

  console.log('Migração concluída.');
}

migrate();
