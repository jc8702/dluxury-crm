import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
    // Verificar todas as colunas UUID de titulos_receber e seus tipos nas tabelas de origem
    const checks = [
        { col: 'cliente_id', ref_table: 'clients' },
        { col: 'projeto_id', ref_table: 'projects' },
        { col: 'orcamento_id', ref_table: 'orcamentos' },
        { col: 'classe_financeira_id', ref_table: 'classes_financeiras' },
        { col: 'forma_recebimento_id', ref_table: 'formas_pagamento' },
    ];
    
    for (const c of checks) {
        const refCols = await sql`SELECT data_type FROM information_schema.columns WHERE table_name = ${c.ref_table} AND column_name = 'id' LIMIT 1`;
        const refType = refCols[0]?.data_type || 'TABLE_NOT_FOUND';
        
        const myCol = await sql`SELECT data_type FROM information_schema.columns WHERE table_name = 'titulos_receber' AND column_name = ${c.col} LIMIT 1`;
        const myType = myCol[0]?.data_type || 'COL_NOT_FOUND';
        
        const match = refType === myType ? '✅ MATCH' : '❌ MISMATCH';
        console.log(`${match} | titulos_receber.${c.col} (${myType}) <-> ${c.ref_table}.id (${refType})`);
    }
    
    // Simulated INSERT test with real data
    const testCliente = await sql`SELECT id FROM clients LIMIT 1`;
    const testClasse = await sql`SELECT id FROM classes_financeiras WHERE tipo = 'analitica' LIMIT 1`;
    const testForma = await sql`SELECT id FROM formas_pagamento LIMIT 1`;
    
    console.log('\nTestando INSERT real...');
    try {
        const res = await sql`
            INSERT INTO titulos_receber (
                numero_titulo, cliente_id, projeto_id, orcamento_id, 
                valor_original, valor_liquido, valor_aberto, 
                data_emissao, data_vencimento, data_competencia, 
                classe_financeira_id, condicao_pagamento_id, forma_recebimento_id, 
                status, parcela, total_parcelas, observacoes
            ) VALUES (
                'TEST-001', ${testCliente[0].id}, NULL, NULL, 
                1000, 1000, 1000, 
                NOW(), NOW(), NOW(), 
                ${testClasse[0].id}, NULL, ${testForma[0].id}, 
                'aberto', 1, 1, 'test'
            ) RETURNING id`;
        console.log('INSERT OK! id:', res[0]?.id);
        await sql`DELETE FROM titulos_receber WHERE id = ${res[0].id}`;
        console.log('✅ INSERT/DELETE cycle completado. Problema resolvido!');
    } catch (err) {
        console.error('❌ INSERT ERROR:', err.message);
    }
}
run().catch(console.error);
