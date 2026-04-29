import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function testInsert() {
  const dbUrl = process.env.DATABASE_URL;
  const sql = neon(dbUrl);
  
  console.log('Testando INSERT na tabela retalhos_estoque...');
  
  try {
    const result = await sql`
      INSERT INTO "retalhos_estoque" (
        "largura_mm", "altura_mm", "espessura_mm", "sku_chapa", "origem", 
        "plano_corte_origem_id", "usuario_criou"
      ) VALUES (
        500, 500, 18, 'MDF-TESTE', 'teste_manual', 
        '00000000-0000-0000-0000-000000000000', 'sistema'
      ) RETURNING "id"
    `;
    console.log('INSERT bem sucedido! ID:', result[0].id);
  } catch (err: any) {
    console.error('ERRO NO INSERT:', err.message);
    if (err.detail) console.error('DETALHE:', err.detail);
    if (err.hint) console.error('DICA:', err.hint);
  }
}

testInsert().catch(console.error);
