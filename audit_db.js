import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
    try {
        console.log('--- AUDITORIA DE TABELAS (ESM) ---');
        
        const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log('Tabelas existentes:', tables.map(t => t.table_name).join(', '));

        const tablesToAudit = ['condicoes_pagamento', 'titulos_pagar', 'titulos_receber', 'contas_internas', 'formas_pagamento'];
        
        for (const table of tablesToAudit) {
            const cols = await sql`SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = ${table}`;
            console.log(`\nColunas da tabela [${table}]:`);
            cols.forEach(c => {
                console.log(` - ${c.column_name} (${c.data_type}) ${c.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}`);
            });
        }

    } catch (e) {
        console.error('ERRO NA AUDITORIA:', e);
    }
}

run();
