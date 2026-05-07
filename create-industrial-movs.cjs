const { neon } = require('@neondatabase/serverless');
const sql = neon("postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  console.log('--- CREATING INDUSTRIAL MOVEMENTS TABLE ---');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS erp_movimentacoes_industrial (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tipo VARCHAR(30) NOT NULL,
        item_tipo VARCHAR(20) NOT NULL,
        chapa_id UUID,
        retalho_id UUID,
        plano_corte_id UUID,
        quantidade INTEGER DEFAULT 1,
        motivo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        usuario_id VARCHAR(100)
      )
    `;
    console.log('Table erp_movimentacoes_industrial created.');
  } catch (err) {
    console.error(err);
  }
}
run();
