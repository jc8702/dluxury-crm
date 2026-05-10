import { db } from './drizzle-db.js';
import { 
    skuEngenharia, skuMontagem, skuComponente, 
    bomEngenhariaMontagem, bomMontagemComponente,
    orcamentos, orcamentoItens, orcamentoListaExplodida 
} from '../db/schema/engenharia-orcamentos.js';
import { eq, sql as dsql, and, inArray, or, ilike } from 'drizzle-orm';
import { auditLog, validateAuth, sql } from './_db.js';

/**
 * SERVIÇO DE ORÇAMENTOS PROFISSIONAIS - INTEGRADO
 */

/**
 * Explode um SKU de Engenharia usando CTE Recursivo para máxima performance
 */
export async function explodirBOM(skuEngId: string, qtdItem: number = 1) {
    const query = dsql`
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
export async function recalcularOrcamento(orcId: string) {
    console.log(`🔄 [RECALCULO] Iniciando para orç: ${orcId}`);
    // 1. Atualizar custos de cada item baseado na lista explodida
    const itensOrc = await db.select().from(orcamentoItens).where(eq(orcamentoItens.orcamentoId, orcId));
    
    for (const item of itensOrc) {
        const explodida = await db.select().from(orcamentoListaExplodida).where(eq(orcamentoListaExplodida.orcamentoItemId, item.id));
        
        // Se houver explosão, recalcula. Se não, mantém o custo atual (importante para itens importados/avulsos)
        if (explodida.length > 0) {
            const custoItem = explodida.reduce((sum, c) => {
                const val = (Number(c.quantidadeAjustada || 0) * Number(c.custoUnitario || 0));
                return sum + (isNaN(val) ? 0 : val);
            }, 0);
            
            await db.update(orcamentoItens)
                .set({ custoUnitarioCalculado: custoItem.toFixed(2) })
                .where(eq(orcamentoItens.id, item.id));
        }
    }

    // 2. Atualizar totais do cabeçalho
    const orc = await db.query.orcamentos.findFirst({ where: eq(orcamentos.id, orcId) });
    if (!orc) {
        console.warn(`⚠️ [RECALCULO] Orçamento ${orcId} não encontrado.`);
        return;
    }

    const itensAtualizados = await db.select().from(orcamentoItens).where(eq(orcamentoItens.orcamentoId, orcId));
    const custoTotal = itensAtualizados.reduce((sum, i) => {
        const val = (Number(i.custoUnitarioCalculado || 0) * Number(i.quantidade || 0));
        return sum + (isNaN(val) ? 0 : val);
    }, 0);
    
    const margem = 1 + (Number(orc.margemLucroPercentual || 0) / 100);
    const taxa = 1 + (Number(orc.taxaFinanceiraPercentual || 0) / 100);
    const desc = 1 - (Number(orc.descontoPercentual || 0) / 100);

    let vendaTotal = (custoTotal * margem * taxa * desc);
    if (isNaN(vendaTotal)) vendaTotal = 0;

    console.log(`📊 [RECALCULO] Custo Total: ${custoTotal} | Venda Total: ${vendaTotal}`);

    await db.update(orcamentos)
        .set({ 
            valorTotalCusto: custoTotal.toFixed(2),
            valorTotalVenda: vendaTotal.toFixed(2),
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

            if (action === 'search-skus') {
                const query = url.searchParams.get('q') || '';
                const limit = parseInt(url.searchParams.get('limit') || '10');
                
                if (query.length < 2) return res.status(200).json({ success: true, data: [] });

                console.log(`🔍 [API PRO] Buscando SKUs para: "${query}"`);

                // Busca em Componentes Industriais
                const comps = await db.select({ 
                    id: skuComponente.id, 
                    codigo: skuComponente.codigo, 
                    nome: skuComponente.nome, 
                    preco: skuComponente.precoUnitario 
                })
                .from(skuComponente)
                .where(or(ilike(skuComponente.codigo, `%${query}%`), ilike(skuComponente.nome, `%${query}%`)))
                .limit(limit);

                // Busca em Engenharia (Módulos)
                const engs = await db.select({ 
                    id: skuEngenharia.id, 
                    codigo: skuEngenharia.codigo, 
                    nome: skuEngenharia.nome 
                })
                .from(skuEngenharia)
                .where(or(ilike(skuEngenharia.codigo, `%${query}%`), ilike(skuEngenharia.nome, `%${query}%`)))
                .limit(limit);

                const finalData = [
                    ...comps.map(c => ({ ...c, preco: Number(c.preco || 0), tipo: 'COMPONENTE' })),
                    ...engs.map(e => ({ ...e, preco: 0, tipo: 'ENGENHARIA' }))
                ];

                console.log(`✅ [API PRO] Encontrados ${finalData.length} resultados.`);
                return res.status(200).json({ success: true, data: finalData });
            }

            if (id) {
                console.log(`🔍 [API PRO] Buscando orçamento: ${id}`);
                let result = await db.query.orcamentos.findFirst({
                    where: eq(orcamentos.id, id),
                    with: {
                        itens: {
                            with: {
                                skuEngenharia: true,
                                listaExplodida: {
                                    with: {
                                        componente: true
                                    }
                                }
                            }
                        }
                    }
                });

                // FALLBACK: Se não encontrou na tabela PRO, busca na tabela comercial legada
                if (!result) {
                    console.log(`🔍 [API PRO] ID ${id} não encontrado na tabela PRO. Buscando na tabela comercial...`);
                    const oldOrc = (await sql`SELECT * FROM orcamentos WHERE id = ${id} AND deleted_at IS NULL`)[0];
                    
                    if (oldOrc) {
                        console.log(`✅ [API PRO] Orçamento legado encontrado. Mapeando para formato PRO...`);
                        const oldItens = await sql`SELECT * FROM itens_orcamento WHERE orcamento_id = ${id}`;
                        
                        // Converte o formato legado para o formato PRO
                        result = {
                            id: oldOrc.id,
                            numeroOrcamento: oldOrc.numero || `LEG-${oldOrc.id.substring(0,8)}`,
                            clienteId: oldOrc.cliente_id,
                            projetoId: oldOrc.projeto_id,
                            dataOrcamento: oldOrc.created_at,
                            status: (oldOrc.status || 'RASCUNHO').toUpperCase(),
                            valorTotalVenda: oldOrc.valor_final || 0,
                            valorTotalCusto: oldOrc.valor_base || 0,
                            margemLucroPercentual: 30, // Default para legados
                            itens: oldItens.map((it: any) => ({
                                id: it.id,
                                nomeCustomizado: it.descricao,
                                quantidade: it.quantidade?.toString() || '1',
                                largura: it.largura_cm?.toString(),
                                altura: it.altura_cm?.toString(),
                                material: it.material,
                                precoVendaUnitario: it.valor_unitario?.toString() || '0'
                            }))
                        };
                    }
                }

                if (!result) {
                    return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });
                }

                return res.status(200).json({ success: true, data: result });
            }

            const list = await db.select().from(orcamentos).orderBy(dsql`${orcamentos.createdAt} DESC`);
            return res.status(200).json({ success: true, data: list });
        }

        if (method === 'POST') {
            const { header, itens } = req.body;
            console.log("🆕 [API PRO] Criando novo orçamento...");

            try {
                // Criar orçamento
                const [newOrc] = await db.insert(orcamentos).values({
                    clienteId: header.clienteId || null,
                    projetoId: header.projetoId || null,
                    validadeDias: header.validadeDias || 15,
                    margemLucroPercentual: header.margemLucroPercentual?.toString() || '30',
                    numeroOrcamento: `PRO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*9999).toString().padStart(4,'0')}`,
                    status: 'RASCUNHO'
                }).returning();

                console.log(`✅ [API PRO] Orçamento criado: ${newOrc.id}`);

                // Adicionar itens e explodir BOM
                for (const item of (itens || [])) {
                    const [newItem] = await db.insert(orcamentoItens).values({
                        orcamentoId: newOrc.id,
                        skuEngenhariaId: item.skuEngenhariaId,
                        quantidade: item.quantidade.toString()
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
            } catch (err: any) {
                console.error("❌ [API PRO] Erro ao criar orçamento:", err);
                return res.status(500).json({ success: false, error: `Erro na criação: ${err.message}` });
            }
        }

        if (method === 'PUT') {
            if (!id) return res.status(400).json({ success: false, error: 'ID obrigatório' });

            // Verificar se o orçamento existe antes de qualquer PUT
            let exists = await db.query.orcamentos.findFirst({ where: eq(orcamentos.id, id) });
            
            // FALLBACK DE MIGRAÇÃO: Se não existe na PRO, mas existe na legada, migramos agora.
            if (!exists) {
                console.log(`🚀 [API PRO] Migrando orçamento ${id} da tabela legada para a PRO durante atualização...`);
                const oldOrc = (await sql`SELECT * FROM orcamentos WHERE id = ${id} AND deleted_at IS NULL`)[0];
                
                if (oldOrc) {
                    try {
                        const [newPro] = await db.insert(orcamentos).values({
                            id: oldOrc.id,
                            numeroOrcamento: oldOrc.numero || `MIG-${oldOrc.id.substring(0,8)}`,
                            clienteId: oldOrc.cliente_id,
                            projetoId: oldOrc.projeto_id,
                            dataOrcamento: oldOrc.created_at ? new Date(oldOrc.created_at) : new Date(),
                            status: (oldOrc.status || 'RASCUNHO').toUpperCase(),
                            valorTotalVenda: (oldOrc.valor_final || 0).toString(),
                            valorTotalCusto: (oldOrc.valor_base || 0).toString(),
                            margemLucroPercentual: '30',
                            taxaFinanceiraPercentual: '0',
                            descontoPercentual: '0',
                            validadeDias: 15
                        }).returning();
                        exists = newPro;
                        console.log(`✅ [API PRO] Orçamento ${id} migrado com sucesso.`);
                    } catch (migErr: any) {
                        console.error(`❌ [API PRO] Falha na migração automática:`, migErr);
                        return res.status(500).json({ success: false, error: 'Erro ao migrar orçamento legado para o novo formato.' });
                    }
                }
            }

            if (!exists) {
                return res.status(404).json({ success: false, error: 'Orçamento não encontrado para atualização.' });
            }

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
                        quantidade: quantidade.toString()
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
                            quantidade: '1',
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
                const { items } = req.body; 
                console.log(`📥 [API PRO] Iniciando importação em lote de ${items?.length} itens para o orçamento ${id}`);
                
                try {
                    // 1. Preparar itens para inserção em lote
                    const itemsToInsert = items.map((it: any) => ({
                        orcamentoId: id,
                        skuEngenhariaId: null,
                        nomeCustomizado: it.nome || 'Item sem nome',
                        quantidade: (it.quantidade || 1).toString(),
                        largura: it.largura?.toString() || null,
                        altura: it.altura?.toString() || null,
                        espessura: it.espessura?.toString() || null,
                        material: it.material || null,
                        custoUnitarioCalculado: (it.match_sugerido?.custoUnitario || it.custoUnitario || 0).toString(),
                        observacoes: `Importado via CSV`
                    }));

                    // 2. Inserir itens
                    const insertedItens = await db.insert(orcamentoItens).values(itemsToInsert).returning();
                    console.log(`✅ [API PRO] ${insertedItens.length} registros inseridos em orcamento_itens`);

                    // 3. Criar lista explodida (BOM) para itens que possuem SKU vinculado e são COMPONENTES INDUSTRIAIS
                    const bomToInsert = [];
                    const skuIdsToCheck = items
                        .map((it: any) => it.produto_id || it.match_sugerido?.sku_componente_id || null)
                        .filter(Boolean);

                    const validComponentData = new Map<string, any>();
                    const validMaterialData = new Map<string, any>();
                    
                    if (skuIdsToCheck.length > 0) {
                        // Busca em Componentes Industriais
                        const validComps = await db.select()
                            .from(skuComponente)
                            .where(inArray(skuComponente.id, skuIdsToCheck));
                        validComps.forEach(c => validComponentData.set(c.id, c));

                        // Busca em Materiais Comerciais (como fallback para identificação)
                        const materials = await db.execute(dsql`SELECT id, sku as codigo, nome, preco_custo as "precoUnitario" FROM materiais WHERE id::text IN (${dsql.join(skuIdsToCheck.map(id => dsql`${id}`), dsql.raw(','))})`);
                        materials.rows.forEach((m: any) => validMaterialData.set(m.id, m));
                    }

                    for (let i = 0; i < insertedItens.length; i++) {
                        const originalItem = items[i];
                        const skuId = originalItem.produto_id || originalItem.match_sugerido?.sku_componente_id || null;
                        
                        const skuData = skuId ? (validComponentData.get(skuId) || validMaterialData.get(skuId)) : null;
                        
                        if (skuData) {
                            const precoDb = Number(skuData.precoUnitario || 0);
                            const skuCodigo = skuData.codigo || originalItem.match_sugerido?.nome || '';

                            // Se for componente industrial, cria a BOM
                            if (validComponentData.has(skuId)) {
                                bomToInsert.push({
                                    orcamentoItemId: insertedItens[i].id,
                                    skuComponenteId: skuId,
                                    quantidadeCalculada: (originalItem.quantidade || 1).toString(),
                                    quantidadeAjustada: (originalItem.quantidade || 1).toString(),
                                    custoUnitario: precoDb.toString(),
                                    origem: 'IMPORT'
                                });
                            }

                            // Atualiza o item principal com dados do SKU (independente de ser comercial ou industrial)
                            await db.update(orcamentoItens)
                                .set({ 
                                    custoUnitarioCalculado: precoDb.toString(),
                                    nomeCustomizado: originalItem.nome || skuData.nome,
                                    material: skuCodigo // SALVAMOS O CÓDIGO NO CAMPO MATERIAL PARA EXIBIÇÃO
                                })
                                .where(eq(orcamentoItens.id, insertedItens[i].id));
                        }
                    }

                    if (bomToInsert.length > 0) {
                        await db.insert(orcamentoListaExplodida).values(bomToInsert);
                        console.log(`✅ [API PRO] ${bomToInsert.length} vínculos de SKU criados na lista explodida`);
                    }

                    // 4. Recalcular
                    // 2. Recalcular orçamentos (garante consistência de valores totais e BOM)
                    console.log(`🧮 [API PRO] Recalculando orçamento ${id}...`);
                    await recalcularOrcamento(id);
                    
                    // 3. Retornar sucesso explícito
                    return res.status(200).json({ 
                        success: true, 
                        message: `${insertedItens.length} itens importados e orçamento recalculado.`
                    });
                } catch (err: any) {
                    console.error("❌ [API PRO] Erro crítico na importação em lote:", err);
                    return res.status(500).json({ success: false, error: `Falha na importação: ${err.message}` });
                }
            }

            if (action === 'update-item') {
                const { itemId, ...updates } = req.body;
                await db.update(orcamentoItens).set(updates).where(eq(orcamentoItens.id, itemId));
                
                // Se o material foi alterado manualmente e não por SKU, recalcula apenas totais
                await recalcularOrcamento(id);
                return res.status(200).json({ success: true });
            }

            if (action === 'update-sku') {
                const { itemId, skuId, tipo } = req.body;
                const item = await db.query.orcamentoItens.findFirst({ where: eq(orcamentoItens.id, itemId) });
                if (!item) return res.status(404).json({ success: false, error: 'Item não encontrado' });

                if (tipo === 'ENGENHARIA') {
                    // Se for módulo, limpa a explodida antiga e gera a nova
                    await db.delete(orcamentoListaExplodida).where(eq(orcamentoListaExplodida.orcamentoItemId, itemId));
                    const comps = await explodirBOM(skuId, 1);
                    
                    if (comps.length > 0) {
                        await db.insert(orcamentoListaExplodida).values(
                            comps.map(c => ({
                                orcamentoItemId: itemId,
                                skuComponenteId: c.skuComponenteId,
                                quantidadeCalculada: c.quantidadeCalculada.toString(),
                                quantidadeAjustada: c.quantidadeCalculada.toString(),
                                custoUnitario: c.custoUnitario.toString(),
                                origem: 'BOM'
                            }))
                        );
                    }

                    await db.update(orcamentoItens).set({ 
                        skuEngenhariaId: skuId,
                        material: null 
                    }).where(eq(orcamentoItens.id, itemId));
                } else {
                    // Se for componente direto
                    const comp = await db.query.skuComponente.findFirst({ where: eq(skuComponente.id, skuId) });
                    if (!comp) return res.status(404).json({ success: false, error: 'Componente não encontrado' });

                    await db.delete(orcamentoListaExplodida).where(eq(orcamentoListaExplodida.orcamentoItemId, itemId));
                    await db.insert(orcamentoListaExplodida).values({
                        orcamentoItemId: itemId,
                        skuComponenteId: skuId,
                        quantidadeCalculada: '1',
                        quantidadeAjustada: '1',
                        custoUnitario: comp.precoUnitario,
                        origem: 'MANUAL'
                    });

                    await db.update(orcamentoItens).set({ 
                        skuEngenhariaId: null,
                        material: comp.codigo,
                        custoUnitarioCalculado: comp.precoUnitario
                    }).where(eq(orcamentoItens.id, itemId));
                }

                await recalcularOrcamento(id);
                console.log(`✅ [API PRO] SKU atualizado com sucesso para o item ${itemId}. Custo recalculado.`);
                return res.status(200).json({ success: true });
            }

            if (action === 'delete-item') {
                const { itemId } = req.body;
                await db.delete(orcamentoItens).where(eq(orcamentoItens.id, itemId));
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
        console.error('[API ORÇAMENTOS PRO GLOBAL]', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
