import { sql } from '../src/api-lib/_db.js';

async function check() {
    try {
        const res = await sql`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('clients', 'planos_de_corte') AND column_name = 'id';
        `;
        console.log(JSON.stringify(res, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

check();
