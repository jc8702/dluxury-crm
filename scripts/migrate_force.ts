import { sql } from '../src/api-lib/_db.ts';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  console.log('=== FORCANDO ENUM NO BANCO ===');
  try {
    console.log('1. Verificando tipo atual...');
    const cols = await sql`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'eventos' AND column_name = 'objetivo'
    `;
    console.log('Tipo atual:', cols[0]?.data_type);

    if (cols[0]?.data_type !== 'USER-DEFINED') {
      console.log('2. Criando ENUM...');
      await sql`CREATE TYPE IF NOT EXISTS tipo_objetivo AS ENUM ('medicao', 'apresentacao', 'instalacao', 'pos_venda', 'outro')`;
      
      console.log('3. Alterando coluna...');
      await sql`ALTER TABLE eventos ALTER COLUMN objetivo TYPE tipo_objetivo USING objetivo::tipo_objetivo`;
      console.log('OK!');
    } else {
      console.log('ENUM já existe!');
    }

    console.log('\n=== VERIFICANDO ===');
    const verify = await sql`SELECT data_type FROM information_schema.columns WHERE table_name = 'eventos' AND column_name = 'objetivo'`;
    console.log('Tipo:', verify[0]?.data_type);
    
    process.exit(0);
  } catch (e: any) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
}
migrate();