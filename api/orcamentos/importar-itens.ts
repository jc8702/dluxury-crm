import { db } from '../../src/api-lib/drizzle-db.js';
import { orcamentoItens, skuComponente } from '../../src/db/schema/engenharia-orcamentos.js';
import { eq } from 'drizzle-orm';

/**
 * Salva itens importados no orçamento
 */
export async function handleImportarItensOrcamento(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const { orcamento_id, itens } = req.body;
        if (!orcamento_id || !itens) throw new Error('Dados incompletos');

        const inserted = [];

        for (const item of itens) {
            let precoUnitario = 0;

            // Se tem produto_id, busca o custo atual
            if (item.produto_id) {
                const sku = await db.select().from(skuComponente).where(eq(skuComponente.id, item.produto_id)).limit(1);
                if (sku.length > 0) precoUnitario = Number(sku[0].custoUnitario);
            }

            const novoItem = {
                orcamentoId: orcamento_id,
                skuEngenhariaId: item.produto_id || null,
                nomeCustomizado: item.nome,
                largura: item.largura ? String(item.largura) : null,
                altura: item.altura ? String(item.altura) : null,
                espessura: item.espessura ? String(item.espessura) : null,
                quantidade: item.quantidade,
                custoUnitarioCalculado: String(precoUnitario),
                // Lógica de explosão poderia ser disparada aqui ou via trigger
            };

            const result = await db.insert(orcamentoItens).values(novoItem).returning();
            inserted.push(result[0]);
        }

        return res.status(200).json({ success: true, data: inserted });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
