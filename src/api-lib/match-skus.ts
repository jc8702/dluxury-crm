import { db } from './drizzle-db.js';
import { skuComponente } from '../db/schema/engenharia-orcamentos.js';
import { eq, ilike, or, sql } from 'drizzle-orm';

/**
 * Endpoint para buscar SKUs no banco baseado nos dados do CSV/PDF ou busca manual
 */
export async function handleMatchSKUs(req: any, res: any) {
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

    try {
        // --- AÇÃO DE BUSCA (Autocomplete) ---
        if (req.method === 'GET') {
            const { q } = req.query;
            if (!q) return res.status(200).json({ success: true, data: [] });

            const query = `%${q}%`;
            
            // Busca em ambas as tabelas (Industrial e Comercial)
            const resultsIndustrial = await db.select()
                .from(skuComponente)
                .where(or(
                    ilike(skuComponente.codigo, query),
                    ilike(skuComponente.nome, query)
                ))
                .limit(20);

            const resultsComercial = await db.execute(sql`
                SELECT id, sku as codigo, nome, preco_custo as "precoUnitario", 'COMERCIAL' as tipo 
                FROM materiais 
                WHERE sku ILIKE ${query} OR nome ILIKE ${query} 
                LIMIT 20
            `);

            const combined = [
                ...resultsIndustrial.map(it => ({ ...it, tipo: 'INDUSTRIAL' })),
                ...resultsComercial.rows.map((r: any) => ({
                    id: r.id,
                    codigo: r.codigo,
                    nome: r.nome,
                    precoUnitario: r.precoUnitario,
                    tipo: 'COMERCIAL'
                }))
            ];

            return res.status(200).json({ success: true, data: combined });
        }

        // --- AÇÃO DE MATCH (Lote Importação) ---
        const { itens } = req.body;
        if (!itens || !Array.isArray(itens)) throw new Error('Itens inválidos');

        const enriched = [];
        for (const item of itens) {
            let match = null;
            
            if (item.sku_informado) {
                const skuLimpo = String(item.sku_informado).trim();
                const results = await db.select().from(skuComponente).where(ilike(skuComponente.codigo, skuLimpo)).limit(1);
                if (results.length > 0) match = results[0];
                else {
                    const resMateriais = await db.execute(sql`SELECT id, sku as codigo, nome, preco_custo as "precoUnitario" FROM materiais WHERE sku ILIKE ${skuLimpo} LIMIT 1`);
                    if (resMateriais.rows.length > 0) match = resMateriais.rows[0];
                }
            }

            if (!match && item.nome) {
                const results = await db.select().from(skuComponente).where(or(ilike(skuComponente.nome, `%${item.nome}%`), ilike(skuComponente.codigo, `%${item.nome}%`))).limit(1);
                if (results.length > 0) match = results[0];
            }

            enriched.push({
                ...item,
                produto_id: match?.id || null,
                sku_encontrado: match?.codigo || match?.sku || null,
                status: match ? 'encontrado' : 'nao_encontrado',
                custoUnitario: match?.precoUnitario || match?.custoUnitario || 0
            });
        }
        return res.status(200).json({ success: true, data: enriched });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
