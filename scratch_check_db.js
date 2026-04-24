import 'dotenv/config';
import { sql } from './src/api-lib/_db.js';

async function checkTable() {
  try {
    const results = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'eventos' 
      AND column_name = 'cliente_id'
    `;
    console.log('ESTRUTURA DA TABELA EVENTOS:', JSON.stringify(results, null, 2));
  } catch (e) {
    console.error('ERRO AO CHECAR TABELA:', e.message);
  }
}

checkTable();
