import 'dotenv/config';
import { db } from './src/api-lib/drizzle-db.js';
import { sql } from 'drizzle-orm';

async function main() {
    try {
        const res = await db.execute(sql`
            SELECT id, nome, tenant_id FROM formas_pagamento WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
        `);
        console.log("FORMAS:", res.rows);
        
        const res2 = await db.execute(sql`
            SELECT id, nome, tenant_id FROM contas_internas WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
        `);
        console.log("CONTAS:", res2.rows);
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
main();
