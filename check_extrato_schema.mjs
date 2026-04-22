import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
    console.log('--- MOVIMENTACOES_TESOURARIA ---');
    const m = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'movimentacoes_tesouraria'`;
    console.log(JSON.stringify(m));
    
    console.log('--- BAIXAS ---');
    const b = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'baixas'`;
    console.log(JSON.stringify(b));
}
run();
