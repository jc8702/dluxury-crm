import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
    console.log('--- TITULOS RECEBER ---');
    const colsRec = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'titulos_receber'`;
    console.log('RECV COLS:', JSON.stringify(colsRec));

    console.log('\n--- VERIFICANDO VALORES UUID ---');
    // Note: We can't easily query for "123" in a UUID column without casting
    try {
        const sample = await sql`SELECT * FROM titulos_receber LIMIT 1`;
        console.log('SAMPLE RECORD:', JSON.stringify(sample));
    } catch (e) {
        console.error('Error fetching sample:', e);
    }
}
run().catch(console.error);
