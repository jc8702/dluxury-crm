import { db } from './src/api-lib/drizzle-db.js';
import { sql } from 'drizzle-orm';

async function main() {
    try {
        const res = await db.execute(sql`SELECT count(*) FROM sku_componente`);
        console.log('sku_componente:', res.rows[0]);
        const res2 = await db.execute(sql`SELECT count(*) FROM materiais`);
        console.log('materiais:', res2.rows[0]);
        const res3 = await db.execute(sql`SELECT sku as codigo, nome, preco_custo as "precoUnitario" FROM materiais LIMIT 5`);
        console.log('materiais amostra:', res3.rows);
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
main();
