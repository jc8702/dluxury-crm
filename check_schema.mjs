import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
    const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'titulos_pagar'`;
    console.log('COLUMNS:', JSON.stringify(cols));
}
run().catch(console.error);
