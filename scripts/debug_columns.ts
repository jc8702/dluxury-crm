import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function check() {
  const dbUrl = process.env.DATABASE_URL;
  const sql = neon(dbUrl);
  
  const columns = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'retalhos_estoque'`;
  const names = columns.map(c => c.column_name);
  console.log('COLUNAS ATUAIS:', names.join(', '));
  
  const required = [
    "id", "largura_mm", "altura_mm", "espessura_mm", "sku_chapa", "origem", 
    "plano_corte_origem_id", "projeto_origem", "observacoes", "disponivel", 
    "utilizado_em_id", "data_utilizacao", "descartado", "motivo_descarte", 
    "data_descarte", "localizacao", "created_at", "updated_at", "deleted_at", 
    "usuario_criou", "usuario_atualizou", "metadata"
  ];
  
  const missing = required.filter(r => !names.includes(r));
  console.log('COLUNAS FALTANDO:', missing);
}

check().catch(console.error);
