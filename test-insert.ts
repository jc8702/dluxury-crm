import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL!);

async function testInsert() {
  try {
    const tenants = await sql`SELECT id FROM tenants LIMIT 1`;
    const tenantId = tenants[0].id;

    const r = await sql`INSERT INTO estoque_materiais_detalhado (sku_codigo, descricao, preco_custo_unitario, preco_custo, unidade_medida, unidade_uso, ativo, quantidade_disponivel, fabricante, fornecedor_principal, lead_time_dias, categoria_taxonomia, tenant_id) VALUES ('TEST-001', 'Test SKU', 10.0, 10.0, 'UN', 'UN', true, 0, null, null, null, null, ${tenantId}::uuid) RETURNING *`;
    console.log('Inserted:', r);
  } catch (err) {
    console.error('Error inserting:', err);
  }
}

testInsert().catch(console.error);
