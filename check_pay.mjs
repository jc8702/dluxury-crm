import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
    const fp = await sql`SELECT * FROM formas_pagamento WHERE deletado = false`;
    const cp = await sql`SELECT id, nome, parcelas FROM condicoes_pagamento WHERE deletado = false`;
    console.log('FORMAS_PAGAMENTO:', JSON.stringify(fp));
    console.log('CONDICOES_PAGAMENTO:', JSON.stringify(cp));
}
run().catch(console.error);
