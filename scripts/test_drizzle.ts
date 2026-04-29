import { db } from '../src/api-lib/drizzle-db';
import { retalhosEstoque } from '../src/db/schema/planos-de-corte';
import { eq, and } from 'drizzle-orm';
import 'dotenv/config';

async function testDrizzle() {
  console.log('Testando query via Drizzle ORM...');
  try {
    const results = await db.select().from(retalhosEstoque).where(eq(retalhosEstoque.sku_chapa, 'MDF-PADRAO'));
    console.log('Drizzle executou com sucesso! Resultados:', results.length);
  } catch (err) {
    console.error('ERRO NO DRIZZLE:', err);
  }
}

testDrizzle().catch(console.error);
