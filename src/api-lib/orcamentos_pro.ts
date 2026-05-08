import { db } from './drizzle-db.js';
import { 
    skuEngenharia, skuMontagem, skuComponente, 
    bomEngenhariaMontagem, bomMontagemComponente,
    orcamentos, orcamentoItens, orcamentoListaExplodida 
} from '../db/schema/engenharia-orcamentos.js';
import { eq, sql, and } from 'drizzle-orm';
import { auditLog, validateAuth } from './_db.js';

/**
 * SERVIÇO DE ORÇAMENTOS PROFISSIONAIS - INTEGRADO
 */

/**
 * Explode um SKU de Engenharia usando CTE Recursivo para máxima performance
 */
export async function explodirBOM(skuEngId: string, qtdItem: number = 1) {
    const query = sql`
        WITH RECURSIVE bom_recursivo AS (
            -- Nível 1: SKU Engenharia → SKU Montagem
            SELECT 
                bem.sku_montagem_id,
                bem.quantidade::numeric as quantidade_acumulada,
                1 AS nivel
            FROM bom_engenharia_montagem bem
            WHERE bem.sku_engenharia_id = ${skuEngId}
            
            UNION ALL
            
            -- Nível 2: SKU Montagem → Componentes (Suporta n níveis se houver sub-montagens futuramente)
            -- Nota: Na estrutura atual temos apenas 2 níveis, mas o CTE recursivo é escalável.
            SELECT 
                bmc.sku_componente_id as sku_montagem_id, -- Placeholder para recursão se necessário
                (br.quantidade_acumulada * bmc.quantidade * (1 + bmc.perda_percentual/100))::numeric,
                br.nivel + 1
            FROM bom_recursivo br
            JOIN bom_montagem_componente bmc ON bmc.sku_montagem_id = br.sku_montagem_id
        )
        SELECT 
            br.sku_montagem_id as sku_componente_id,
            SUM(br.quantidade_acumulada) as quantidade_total,
            sc.nome,
            sc.preco_unitario
        FROM bom_recursivo br
        JOIN sku_componente sc ON sc.id = br.sku_montagem_id
        WHERE br.nivel = 2  -- Apenas componentes finais
        GROUP BY br.sku_montagem_id, sc.nome, sc.preco_unitario;
    `;

    const result = await db.execute(query);
    const rows = result.rows as any[];

    return rows.map(r => ({
        skuComponenteId: r.sku_componente_id,
        nome: r.nome,
        quantidadeCalculada: Number(r.quantidade_total) * qtdItem,
        custoUnitario: Number(r.preco_unitario),
        custoTotal: Number(r.quantidade_total) * qtdItem * Number(r.preco_unitario)
    }));
}

/**
 * Recalcula todos os totais de um orçamento (Custo e Venda)
 */
async function recalcularOrcamento(orcId: string) {
    // 1. Atualizar custos de cada item baseado na lista explodida
    const itensOrc = await db.select().from(orcamentoItens).where(eq(orcamentoItens.orcamentoId, orcId));
    
    for (const item of itensOrc) {
        const explodida = await db.select().from(orcamentoListaExplodida).where(eq(orcamentoListaExplodida.orcamentoItemId, item.id));
        const custoItem = explodida.reduce((sum, c) => sum + (Number(c.quantidadeAjustada) * Number(c.custoUnitario)), 0);
        
        await db.update(orcamentoItens)
            .set({ custoUnitarioCalculado: custoItem.toString() })
            .where(eq(orcamentoItens.id, item.id));
    }

    // 2. Atualizar totais do cabeçalho
    const orc = await db.query.orcamentos.findFirst({ where: eq(orcamentos.id, orcId) });
    if (!orc) return;

    const itensAtualizados = await db.select().from(orcamentoItens).where(eq(orcamentoItens.orcamentoId, orcId));
    const custoTotal = itensAtualizados.reduce((sum, i) => sum + (Number(i.custoUnitarioCalculado) * Number(i.quantidade)), 0);
    
    const margem = 1 + (Number(orc.margemLucroPercentual) / 100);
    const taxa = 1 + (Number(orc.taxaFinanceiraPercentual) / 100);
    const desc = 1 - (Number(orc.descontoPercentual) / 100);

    const vendaTotal = (custoTotal * margem * taxa * desc);

    await db.update(orcamentos)
        .set({ 
            valorTotalCusto: custoTotal.toString(),
            valorTotalVenda: vendaTotal.toString(),
            updatedAt: new Date()
        })
        .where(eq(orcamentos.id, orcId));
}

export async function handleOrcamentosPro(req: any, res: any) {
    const auth = await validateAuth(req);
    if (!auth) return res.status(401).json({ success: false, error: 'Não autorizado' });

    const { method } = req;
    const url = new URL(req.url, 'http://localhost');
    const id = url.searchParams.get('id');
    const action = url.searchParams.get('action');

    try {
        if (method === 'GET') {
            if (action === 'explode') {
                const skuId = url.searchParams.get('skuId');
                const qtd = Number(url.searchParams.get('qtd') || 1);
                const componentes = await explodirBOM(skuId!, qtd);
                return res.status(200).json({ success: true, data: componentes });
            }

            if (id) {
                const data = await db.query.orcamentos.findFirst({
                    where: eq(orcamentos.id, id),
                    with: {
                        itens: {
                            with: {
                                listaExplodida: {
                                    with: { componente: true }
                                },
                                skuEngenharia: true
                            }
                        }
                    }
                });
                return res.status(200).json({ success: true, data });
            }

            const list = await db.select().from(orcamentos).orderBy(sql`${orcamentos.createdAt} DESC`);
            return res.status(200).json({ success: true, data: list });
        }

        if (method === 'POST') {
            const { header, itens } = req.body;

            // Criar orçamento
            const [newOrc] = await db.insert(orcamentos).values({
                ...header,
                numeroOrcamento: `PRO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*9999).toString().padStart(4,'0')}`,
                status: 'RASCUNHO'
            }).returning();

            // Adicionar itens e explodir BOM
            for (const item of (itens || [])) {
                const [newItem] = await db.insert(orcamentoItens).values({
                    orcamentoId: newOrc.id,
                    skuEngenhariaId: item.skuEngenhariaId,
                    quantidade: item.quantidade
                }).returning();

                const comps = await explodirBOM(item.skuEngenhariaId, 1);
                if (comps.length > 0) {
                    await db.insert(orcamentoListaExplodida).values(
                        comps.map(c => ({
                            orcamentoItemId: newItem.id,
                            skuComponenteId: c.skuComponenteId,
                            quantidadeCalculada: c.quantidadeCalculada.toString(),
                            quantidadeAjustada: c.quantidadeCalculada.toString(),
                            custoUnitario: c.custoUnitario.toString(),
                            origem: 'BOM'
                        }))
                    );
                }
            }

            await recalcularOrcamento(newOrc.id);
            await auditLog('ORCAMENTO_PRO', newOrc.id, 'CREATE', auth.user?.id || 'system');
            
            return res.status(201).json({ success: true, data: { id: newOrc.id, numeroOrcamento: newOrc.numeroOrcamento } });
        }

        if (method === 'PUT') {
            if (!id) return res.status(400).json({ success: false, error: 'ID obrigatório' });

            if (action === 'update-bom') {
                const { bomId, quantidadeAjustada } = req.body;
                await db.update(orcamentoListaExplodida)
                    .set({ quantidadeAjustada: quantidadeAjustada.toString(), editado: true })
                    .where(eq(orcamentoListaExplodida.id, bomId));
                
                await recalcularOrcamento(id);
                return res.status(200).json({ success: true });
            }

            if (action === 'add-item') {
                const { skuId, quantidade } = req.body;
                
                // Verificar se é um módulo (Engenharia)
                const isEng = await db.query.skuEngenharia.findFirst({ where: eq(skuEngenharia.id, skuId) });
                
                if (isEng) {
                    const [newItem] = await db.insert(orcamentoItens).values({
                        orcamentoId: id,
                        skuEngenhariaId: skuId,
                        quantidade
                    }).returning();

                    const comps = await explodirBOM(skuId, 1);
                    if (comps.length > 0) {
                        await db.insert(orcamentoListaExplodida).values(
                            comps.map(c => ({
                                orcamentoItemId: newItem.id,
                                skuComponenteId: c.skuComponenteId,
                                quantidadeCalculada: c.quantidadeCalculada.toString(),
                                quantidadeAjustada: c.quantidadeCalculada.toString(),
                                custoUnitario: c.custoUnitario.toString(),
                                origem: 'BOM'
                            }))
                        );
                    }
                } else {
                    // Verificar se é um componente (Estoque)
                    const isComp = await db.query.skuComponente.findFirst({ where: eq(skuComponente.id, skuId) });
                    if (isComp) {
                        const [newItem] = await db.insert(orcamentoItens).values({
                            orcamentoId: id,
                            skuEngenhariaId: null,
                            quantidade: 1,
                            observacoes: `ITEM AVULSO: ${isComp.nome}`
                        }).returning();

                        await db.insert(orcamentoListaExplodida).values({
                            orcamentoItemId: newItem.id,
                            skuComponenteId: isComp.id,
                            quantidadeCalculada: quantidade.toString(),
                            quantidadeAjustada: quantidade.toString(),
                            custoUnitario: isComp.precoUnitario?.toString() || '0',
                            origem: 'DIRECT'
                        });
                    }
                }

                await recalcularOrcamento(id);
                return res.status(200).json({ success: true });
            }

            if (action === 'import-items') {
                const { items } = req.body; // Array de { sku_componente_id, quantidade, custoUnitario }
                
                // Criar um item de orçamento genérico para os itens importados
                const [newItem] = await db.insert(orcamentoItens).values({
                    orcamentoId: id,
                    skuEngenhariaId: null, // Sem SKU de engenharia (módulo)
                    quantidade: 1,
                    observacoes: 'ITENS IMPORTADOS VIA PROJETO'
                }).returning();

                const entries = items
                    .filter((it: any) => it.match_sugerido)
                    .map((it: any) => ({
                        orcamentoItemId: newItem.id,
                        skuComponenteId: it.match_sugerido.sku_componente_id,
                        quantidadeCalculada: it.quantidade.toString(),
                        quantidadeAjustada: it.quantidade.toString(),
                        custoUnitario: (it.match_sugerido.custoUnitario || 0).toString(),
                        origem: 'IMPORT'
                    }));

                if (entries.length > 0) {
                    await db.insert(orcamentoListaExplodida).values(entries);
                }

                await recalcularOrcamento(id);
                return res.status(200).json({ success: true });
            }

            // Update Header
            await db.update(orcamentos).set(req.body).where(eq(orcamentos.id, id));
            await recalcularOrcamento(id);
            return res.status(200).json({ success: true });
        }

        if (method === 'DELETE') {
            if (!id) return res.status(400).json({ success: false, error: 'ID obrigatório' });
            await db.delete(orcamentos).where(eq(orcamentos.id, id));
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ success: false, error: 'Método não permitido' });
    } catch (err: any) {
        console.error('[API ORÇAMENTOS PRO]', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
