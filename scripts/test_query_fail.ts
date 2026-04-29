import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function testQuery() {
  const dbUrl = process.env.DATABASE_URL;
  const sql = neon(dbUrl);
  
  console.log('Testando query exata que falhou...');
  
  try {
    const result = await sql`
      SELECT 
        "id", "largura_mm", "altura_mm", "espessura_mm", "sku_chapa", "origem", 
        "plano_corte_origem_id", "projeto_origem", "observacoes", "disponivel", 
        "utilizado_em_id", "data_utilizacao", "descartado", "motivo_descarte", 
        "data_descarte", "localizacao", "created_at", "updated_at", "deleted_at", 
        "usuario_criou", "usuario_atualizou", "metadata"
      FROM "retalhos_estoque"
      WHERE "sku_chapa" = 'MDF-PADRAO'
      ORDER BY "created_at" ASC
    `;
    console.log('Query executada com sucesso! Resultados:', result.length);
  } catch (err) {
    console.error('ERRO NA QUERY:', err);
  }
}

testQuery().catch(console.error);
