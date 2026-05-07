import { sql } from '../src/api-lib/_db.js';

async function check() {
    try {
        const res = await sql`
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'clients'
            ORDER BY column_name;
        `;
        console.log(res.map(r => r.column_name).join(', '));
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

check();
