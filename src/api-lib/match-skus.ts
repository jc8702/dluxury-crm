import { db } from './drizzle-db.js';
import { skuComponente } from '../db/schema/engenharia-orcamentos.js';
import { eq, ilike, or } from 'drizzle-orm';

/**
 * Endpoint para buscar SKUs no banco baseado nos dados do CSV/PDF
 */
export async function handleMatchSKUs(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const { itens } = req.body;
        if (!itens || !Array.isArray(itens)) throw new Error('Itens inválidos');

        const enriched = [];

        for (const item of itens) {
            let match = null;

            // 1. Busca por SKU informado
            if (item.sku_informado) {
                const results = await db.select()
                    .from(skuComponente)
                    .where(eq(skuComponente.codigo, item.sku_informado))
                    .limit(1);
                if (results.length > 0) match = results[0];
            }

            // 2. Busca por Nome (Fuzzy/ILike) se não achou por SKU
            if (!match && item.nome) {
                const results = await db.select()
                    .from(skuComponente)
                    .where(or(
                        ilike(skuComponente.nome, `%${item.nome}%`),
                        ilike(skuComponente.codigo, `%${item.nome}%`)
                    ))
                    .limit(1);
                if (results.length > 0) match = results[0];
            }

            enriched.push({
                ...item,
                produto_id: match?.id || null,
                sku_encontrado: match?.codigo || null,
                status: match ? 'encontrado' : 'nao_encontrado',
                // Adiciona custo se encontrado para facilitar o frontend
                custoUnitario: match?.custoUnitario || 0
            });
        }

        return res.status(200).json({ success: true, data: enriched });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
