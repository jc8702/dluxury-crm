import { db } from './src/api-lib/drizzle-db.js';
import { sql } from 'drizzle-orm';

async function main() {
    try {
        console.log('Rodando alteração de tabela...');
        await db.execute(sql`ALTER TABLE erp_movimentacoes_industrial ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`);
        console.log('Populando dados do Tenant default...');
        await db.execute(sql`UPDATE erp_movimentacoes_industrial SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL`);
        console.log('Estrutura de colunas atualizada:');
        const res = await db.execute(sql`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'erp_movimentacoes_industrial'
        `);
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
main();
