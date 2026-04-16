import { sql } from '../api/lib/_db.js';

async function migrate() {
  console.log('Iniciando migração: Adicionando coluna marca em materiais...');
  try {
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS marca TEXT`;
    console.log('Coluna marca adicionada com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err);
  }
}

migrate();
 Simon
