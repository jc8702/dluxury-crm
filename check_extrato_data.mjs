import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
    console.log('--- MOVIMENTACOES DATA ---');
    const m = await sql`SELECT * FROM movimentacoes_tesouraria LIMIT 3`;
    console.log(JSON.stringify(m, null, 2));

    console.log('--- BAIXAS DATA ---');
    const b = await sql`SELECT * FROM baixas LIMIT 3`;
    console.log(JSON.stringify(b, null, 2));
}
run();
