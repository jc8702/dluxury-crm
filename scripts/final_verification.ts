import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function finalVerification() {
  const dbUrl = process.env.DATABASE_URL;
  const sql = neon(dbUrl);
  
  console.log('Verificação final do INSERT explícito...');
  
  const now = new Date();
  try {
    const result = await sql`
      INSERT INTO "retalhos_estoque" (
        "largura_mm", "altura_mm", "espessura_mm", "sku_chapa", "origem", 
        "plano_corte_origem_id", "projeto_origem", "observacoes", "localizacao",
        "usuario_criou", "disponivel", "descartado", "created_at", "updated_at", "metadata"
      ) VALUES (
        350, 350, 15, 'MDF-V2', 'sobra_plano_corte',
        '00000000-0000-0000-0000-000000000000', 'PROJ-TESTE', 'obs', 'prateleira-a1',
        'sistema', true, false, ${now}, ${now}, '{}'
      ) RETURNING "id"
    `;
    console.log('SISTEMA 100% OPERACIONAL! ID GERADO:', result[0].id);
  } catch (err: any) {
    console.error('FALHA NA VERIFICAÇÃO:', err.message);
  }
}

finalVerification().catch(console.error);
