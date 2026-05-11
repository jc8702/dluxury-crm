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
    console.log(`[ORCAMENTOS_PRO] 🔄 [RECALCULO] Iniciando para orçamento: ${orcId}`);
    
    // 1. Atualizar custos de cada item baseado na lista explodida
    const itensOrc = await db.select().from(orcamentoItens).where(eq(orcamentoItens.orcamentoId, orcId));
    
    for (const item of itensOrc) {
        const explodida = await db.select().from(orcamentoListaExplodida).where(eq(orcamentoListaExplodida.orcamentoItemId, item.id));
        
        // Se houver explosão, recalcula. Se não, mantém o custo atual (importante para itens importados/avulsos)
        if (explodida.length > 0) {
            const custoItem = explodida.reduce((sum, c) => {
                const qtd = parseFloat(c.quantidadeAjustada?.toString() || '0');
                const custo = parseFloat(c.custoUnitario?.toString() || '0');
                const val = (isNaN(qtd) ? 0 : qtd) * (isNaN(custo) ? 0 : custo);
                return sum + val;
            }, 0);
            
            console.log(`[ORCAMENTOS_PRO] 📊 Item ${item.id} - Custo Calculado: ${custoItem.toFixed(2)}`);
            
            await db.update(orcamentoItens)
                .set({ custoUnitarioCalculado: (isNaN(custoItem) ? 0 : custoItem).toFixed(2) })
                .where(eq(orcamentoItens.id, item.id));
        }
    }

    // 2. Atualizar totais do cabeçalho
    const orc = await db.query.orcamentos.findFirst({ where: eq(orcamentos.id, orcId) });
    if (!orc) {
        console.warn(`[ORCAMENTOS_PRO] ⚠️ [RECALCULO] Orçamento ${orcId} não encontrado.`);
        return;
    }

    const itensAtualizados = await db.select().from(orcamentoItens).where(eq(orcamentoItens.orcamentoId, orcId));
    
    const margemGlobalPercentual = Number(orc.margemLucroPercentual || 30);
    const taxaFinanceiraPercentual = Number(orc.taxaFinanceiraPercentual || 0);
    const descontoPercentual = Number(orc.descontoPercentual || 0);

    console.log(`[ORCAMENTOS_PRO] ⚙️ Config: Margem=${margemGlobalPercentual}% | Taxa=${taxaFinanceiraPercentual}%`);

    // 2. Atualizar preços de venda dos itens
    for (const item of itensAtualizados) {
        const custoUnitario = Number(item.custoUnitarioCalculado || 0);
        let novoPrecoVenda = 0;
        let novaMargem = margemGlobalPercentual;

        if (item.possuiOverride && item.precoVendaSobrescrito) {
            // Se possui override manual de preço, respeitamos o preço e recalculamos a margem real
            novoPrecoVenda = Number(item.precoVendaSobrescrito);
            novaMargem = novoPrecoVenda > 0 ? ((novoPrecoVenda - custoUnitario) / novoPrecoVenda) * 100 : 0;
            console.log(`[ORCAMENTOS_PRO] 🎯 Item ${item.id} (OVERRIDE) -> Venda: ${novoPrecoVenda.toFixed(2)} | Margem Real: ${novaMargem.toFixed(2)}%`);
        } else {
            // Cálculo SOLICITADO: preço_venda = custo_unitário * (1 + margem/100)
            // Incluindo taxa financeira se existir: preço_venda = (custo * (1 + margem/100)) * (1 + taxa)
            const baseVenda = custoUnitario * (1 + (margemGlobalPercentual / 100));
            novoPrecoVenda = baseVenda * (1 + (taxaFinanceiraPercentual / 100));
            novaMargem = margemGlobalPercentual;
            
            console.log(`[ORCAMENTOS_PRO] 💹 Item ${item.id} (AUTO) -> Custo: ${custoUnitario.toFixed(2)} | Venda: ${novoPrecoVenda.toFixed(2)} | Margem: ${novaMargem}%`);
        }

        await db.update(orcamentoItens)
            .set({ 
                precoVendaUnitario: novoPrecoVenda.toFixed(2),
                margemLucro: novaMargem.toFixed(2),
                updatedAt: new Date()
            })
            .where(eq(orcamentoItens.id, item.id));
    }

    // 3. Atualizar totais do cabeçalho re-lendo os itens
    const itensFinais = await db.select().from(orcamentoItens).where(eq(orcamentoItens.orcamentoId, orcId));
    
    const custoTotal = itensFinais.reduce((sum, i) => {
        const val = (Number(i.custoUnitarioCalculado || 0) * Number(i.quantidade || 0));
        return sum + (isNaN(val) ? 0 : val);
    }, 0);
    
    const vendaTotalSemDesconto = itensFinais.reduce((sum, i) => {
        const val = (Number(i.precoVendaUnitario || 0) * Number(i.quantidade || 0));
        return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const valorFinal = vendaTotalSemDesconto * (1 - (descontoPercentual / 100));

    console.log(`[ORCAMENTOS_PRO] ✅ [RECALCULO FINALIZADO] Custo: ${custoTotal.toFixed(2)} | Venda Bruta: ${vendaTotalSemDesconto.toFixed(2)} | Final: ${valorFinal.toFixed(2)}`);

    await db.update(orcamentos)
        .set({ 
            valorTotalCusto: custoTotal.toFixed(2),
            valorTotalVenda: valorFinal.toFixed(2),
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
                console.log(`[ORCAMENTOS_PRO] 🔍 Buscando orçamento: ${id}`);
                let result;
                try {
                    result = await db.query.orcamentos.findFirst({
                        where: eq(orcamentos.id, id),
                        with: {
                            itens: {
                                with: {
                                    skuEngenharia: true,
                                    skuComponente: true,
                                    listaExplodida: {
                                        with: {
                                            componente: true
                                        }
                                    }
                                }
                            }
                        }
                    });
                } catch (dbErr: any) {
                    console.error(`[ORCAMENTOS_PRO] ❌ Erro Crítico no Drizzle (findFirst):`, dbErr);
                    // Se falhar o findFirst complexo, tentamos um simples sem 'with' para recuperar o básico
                    result = await db.query.orcamentos.findFirst({ where: eq(orcamentos.id, id) });
                    if (result) {
                        console.warn(`[ORCAMENTOS_PRO] ⚠️ Recuperado com busca simples. O erro de 'with' persiste.`);
                        (result as any)._error = dbErr.message;
                    } else {
                        throw dbErr;
                    }
                }

                // FALLBACK: Se não encontrou na tabela PRO, busca na tabela comercial legada
                if (!result) {
                    console.log(`[ORCAMENTOS_PRO] 🔍 ID ${id} não encontrado na tabela PRO. Buscando na tabela comercial...`);
                    const oldOrc = (await sql`SELECT * FROM orcamentos WHERE id = ${id} AND deleted_at IS NULL`)[0];
                    
                    if (oldOrc) {
                        console.log(`[ORCAMENTOS_PRO] ✅ Orçamento legado encontrado. Mapeando para formato PRO...`);
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
                    console.warn(`[ORCAMENTOS_PRO] ⚠️ Orçamento ${id} não encontrado em nenhuma tabela.`);
                    return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });
                }

                console.log(`[ORCAMENTOS_PRO] ✅ Orçamento ${id} carregado com ${result.itens?.length || 0} itens.`);
                return res.status(200).json({ success: true, data: result });
            }

            const q = url.searchParams.get('q') || '';
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const offset = (page - 1) * limit;

            let query = db.select().from(orcamentos).orderBy(dsql`${orcamentos.createdAt} DESC`);
            
            if (q) {
                query = db.select()
                    .from(orcamentos)
                    .where(ilike(orcamentos.numeroOrcamento, `%${q}%`))
                    .orderBy(dsql`${orcamentos.createdAt} DESC`) as any;
            }

            const total = await db.select({ count: dsql`count(*)` }).from(orcamentos);
            const list = await (query as any).limit(limit).offset(offset);

            return res.status(200).json({ 
                success: true, 
                data: list,
                pagination: {
                    total: Number(total[0].count),
                    page,
                    limit,
                    pages: Math.ceil(Number(total[0].count) / limit)
                }
            });
        }

        if (method === 'POST') {
            const header = req.body?.header || {};
            const itens = req.body?.itens || [];
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
                const items = req.body?.items || [];
                console.log(`📤 [API PRO] Iniciando importação em lote para orçamento ${id} (${items.length} itens)...`);
                
                if (!Array.isArray(items)) {
                    return res.status(400).json({ success: false, error: 'O payload de itens deve ser um array.' });
                }

                const report = {
                    total: items.length,
                    success: 0,
                    failed: 0,
                    errors: [] as string[]
                };

                try {
                    // 1. Coletar e validar IDs de SKU
                    const skuIdsToCheck = items
                        .map((it: any) => it.sku_id || it.produto_id || it.match_sugerido?.sku_componente_id || null)
                        .filter(id => id && typeof id === 'string' && id.length > 10); // Filtro básico de UUID

                    console.log(`🔍 [API PRO] Validando ${skuIdsToCheck.length} SKUs vinculados...`);

                    const validComponentData = new Map<string, any>();
                    const validMaterialData = new Map<string, any>();
                    
                    if (skuIdsToCheck.length > 0) {
                        try {
                            const validComps = await db.select()
                                .from(skuComponente)
                                .where(inArray(skuComponente.id, skuIdsToCheck));
                            validComps.forEach(c => validComponentData.set(c.id, c));
                            console.log(`✅ [API PRO] ${validComponentData.size} SKUs encontrados na tabela de componentes.`);

                            // Busca segura em Materiais
                            const materials = await db.execute(dsql`
                                SELECT id::text, sku as codigo, nome, preco_custo::numeric as "precoUnitario" 
                                FROM materiais 
                                WHERE id::text IN (${dsql.join(skuIdsToCheck.map(id => dsql`${id}`), dsql.raw(','))})
                            `);
                            materials.rows.forEach((m: any) => validMaterialData.set(m.id, m));
                            console.log(`✅ [API PRO] ${validMaterialData.size} SKUs encontrados na tabela de materiais.`);
                        } catch (lookupErr: any) {
                            console.warn("⚠️ [API PRO] Erro parcial na validação de SKUs (prosseguindo):", lookupErr.message);
                        }
                    }

                    // 2. Inserção Resiliente (Item a Item)
                    for (let i = 0; i < items.length; i++) {
                        const originalItem = items[i];
                        const itemLabel = `Item #${i+1} (${originalItem.nome || 'Sem Nome'})`;

                        try {
                            // Sanitização e Coerção de tipos
                            const qtd = parseFloat(originalItem.quantidade);
                            const safeQtd = isNaN(qtd) ? 1 : qtd;
                            const skuId = originalItem.sku_id || originalItem.produto_id || originalItem.match_sugerido?.sku_componente_id || null;
                            
                            // Validar se SKU pertence à tabela de componentes (FK restriction)
                            const finalSkuComponenteId = (skuId && validComponentData.has(skuId)) ? skuId : null;
                            
                            // Obter custo base com fallback seguro
                            let custoBase = 0;
                            if (skuId) {
                                const data = validComponentData.get(skuId) || validMaterialData.get(skuId);
                                custoBase = parseFloat(data?.precoUnitario || originalItem.match_sugerido?.custoUnitario || originalItem.custoUnitario || 0);
                            } else {
                                custoBase = parseFloat(originalItem.custoUnitario || 0);
                            }
                            if (isNaN(custoBase)) custoBase = 0;

                            // Helper para sanitizar números e evitar NaN no banco
                            const safeNum = (val: any, fallback = 0) => {
                                const parsed = parseFloat(val);
                                return isNaN(parsed) ? fallback.toFixed(2) : parsed.toFixed(2);
                            };

                            const itemData = {
                                orcamentoId: id,
                                nomeCustomizado: (originalItem.nome || originalItem.descricao || 'Item sem nome').substring(0, 255),
                                quantidade: isNaN(parseFloat(originalItem.quantidade)) ? "1.000" : parseFloat(originalItem.quantidade).toFixed(3),
                                largura: (originalItem.largura || originalItem.largura_cm || '').toString().substring(0, 20),
                                altura: (originalItem.altura || originalItem.altura_cm || '').toString().substring(0, 20),
                                espessura: (originalItem.espessura || originalItem.espessura_mm || '').toString().substring(0, 20),
                                material: (originalItem.material || '').substring(0, 255),
                                skuComponenteId: finalSkuComponenteId,
                                skuCodigo: (originalItem.sku_codigo || originalItem.match_sugerido?.sku_codigo || originalItem.sku_encontrado || '').substring(0, 100),
                                skuDescricao: (originalItem.sku_descricao || originalItem.match_sugerido?.nome || '').substring(0, 500),
                                unidadeMedida: (originalItem.unidade_medida || 'UN').substring(0, 20),
                                custoBaseEstoque: safeNum(custoBase),
                                custoUnitarioCalculado: safeNum(custoBase),
                                precoVendaUnitario: safeNum(custoBase * 1.3), // Markup default 30% na importação
                                origemDados: finalSkuComponenteId ? 'SKU_MATCH' : 'CSV',
                                possuiOverride: false,
                                observacoes: `Importado via CSV em ${new Date().toLocaleDateString()}`
                            };

                            const [inserted] = await db.insert(orcamentoItens).values(itemData).returning();
                            report.success++;

                            // 3. Gerar Lista Explodida se houver SKU Componente
                            if (finalSkuComponenteId) {
                                await db.insert(orcamentoListaExplodida).values({
                                    orcamentoItemId: inserted.id,
                                    skuComponenteId: finalSkuComponenteId,
                                    quantidadeCalculada: inserted.quantidade,
                                    quantidadeAjustada: inserted.quantidade,
                                    custoUnitario: custoBase.toFixed(2),
                                    origem: 'IMPORT'
                                });
                            }

                        } catch (itemErr: any) {
                            report.failed++;
                            const errorMsg = `${itemLabel}: ${itemErr.message}`;
                            console.error(`❌ [API PRO] ${errorMsg}`);
                            report.errors.push(errorMsg);
                        }
                    }

                    // 4. Recalcular Totais
                    if (report.success > 0) {
                        console.log(`🧮 [API PRO] Recalculando totais para ${report.success} itens importados...`);
                        await recalcularOrcamento(id);
                    }

                    if (report.failed === report.total) {
                        return res.status(500).json({ 
                            success: false, 
                            error: 'Todos os itens falharam na importação.',
                            details: report.errors 
                        });
                    }

                    return res.status(200).json({ 
                        success: true, 
                        data: {
                            message: `Importação concluída: ${report.success} sucessos, ${report.failed} falhas.`,
                            ...report
                        }
                    });

                } catch (err: any) {
                    console.error("❌ [API PRO] Erro catastrófico na importação:", err);
                    return res.status(500).json({ success: false, error: `Erro crítico: ${err.message}` });
                }
            }

            if (action === 'reset-to-global-margin') {
                const { itemIds } = req.body;
                if (!Array.isArray(itemIds) || itemIds.length === 0) throw new Error('Nenhum item selecionado');
                
                await db.update(orcamentoItens)
                    .set({ possuiOverride: false, precoVendaSobrescrito: null })
                    .where(and(eq(orcamentoItens.orcamentoId, id), inArray(orcamentoItens.id, itemIds)));
                
                await recalcularOrcamento(id);
                return res.status(200).json({ success: true });
            }

            if (action === 'apply-global-margin') {
                const { margem } = req.body;
                if (typeof margem !== 'number') throw new Error('Margem inválida');

                // Atualizar cabeçalho
                await db.update(orcamentos)
                    .set({ margemLucroPercentual: margem.toString() })
                    .where(eq(orcamentos.id, id));
                
                // Resetar overrides de todos os itens para seguir a nova margem global
                await db.update(orcamentoItens)
                    .set({ possuiOverride: false, precoVendaSobrescrito: null })
                    .where(eq(orcamentoItens.orcamentoId, id));

                await recalcularOrcamento(id);
                
                const count = await db.select({ count: dsql`count(*)` }).from(orcamentoItens).where(eq(orcamentoItens.orcamentoId, id));
                
                return res.status(200).json({ 
                    success: true, 
                    message: `Margem de ${margem}% aplicada a ${count[0].count} itens` 
                });
            }

            if (action === 'bulk-update-items') {
                const { itemIds, updates } = req.body;
                if (!Array.isArray(itemIds) || itemIds.length === 0) throw new Error('Nenhum item selecionado');

                // Aplicar atualizações em lote
                for (const itemId of itemIds) {
                    const item = await db.query.orcamentoItens.findFirst({ where: eq(orcamentoItens.id, itemId) });
                    if (!item) continue;

                    let finalUpdates = { ...updates };

                    // Lógica especial para ajustes percentuais de preço/custo
                    if (updates.percentualPreco) {
                        const atual = Number(item.precoVendaUnitario || item.custoUnitarioCalculado || 0);
                        finalUpdates.precoVendaUnitario = (atual * (1 + Number(updates.percentualPreco) / 100)).toString();
                        finalUpdates.precoVendaSobrescrito = finalUpdates.precoVendaUnitario;
                        finalUpdates.possuiOverride = true;
                        delete finalUpdates.percentualPreco;
                    }

                    if (updates.percentualCusto) {
                        const atual = Number(item.custoUnitarioCalculado || 0);
                        finalUpdates.custoUnitarioCalculado = (atual * (1 + Number(updates.percentualCusto) / 100)).toString();
                        finalUpdates.custoSobrescrito = finalUpdates.custoUnitarioCalculado;
                        finalUpdates.possuiOverride = true;
                        delete finalUpdates.percentualCusto;
                    }

                    await db.update(orcamentoItens).set(finalUpdates).where(eq(orcamentoItens.id, itemId));
                }

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

            if (action === 'update-item') {
                const { itemId, ...updates } = req.body;
                console.log(`[ORCAMENTOS_PRO] 📝 Atualizando item ${itemId}:`, JSON.stringify(updates, null, 2));
                
                // Buscar item atual para comparar SKU
                const oldItem = await db.query.orcamentoItens.findFirst({ where: eq(orcamentoItens.id, itemId) });
                
                if (!oldItem) {
                    console.error(`[ORCAMENTOS_PRO] ❌ Item ${itemId} não encontrado.`);
                    return res.status(404).json({ success: false, error: 'Item não encontrado' });
                }

                // Normalização de SKUs para garantir persistência correta
                // Se o frontend enviar 'skuId', mapeamos para o campo correto baseado no 'skuTipo'
                if (updates.skuId) {
                    if (updates.skuTipo === 'ENGENHARIA') {
                        updates.skuEngenhariaId = updates.skuId;
                        updates.skuComponenteId = null;
                    } else {
                        updates.skuComponenteId = updates.skuId;
                        updates.skuEngenhariaId = null;
                    }
                    delete updates.skuId;
                    delete updates.skuTipo;
                }

                // Detectar se o SKU mudou para re-explodir ou atualizar referências
                if (updates.skuEngenhariaId && updates.skuEngenhariaId !== oldItem.skuEngenhariaId) {
                    console.log(`[ORCAMENTOS_PRO] 🔄 SKU de Engenharia mudou. Re-explodindo BOM para item ${itemId}...`);
                    await db.delete(orcamentoListaExplodida).where(eq(orcamentoListaExplodida.orcamentoItemId, itemId));
                    const comps = await explodirBOM(updates.skuEngenhariaId, 1);
                    
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
                } else if (updates.skuComponenteId && updates.skuComponenteId !== oldItem.skuComponenteId) {
                    console.log(`[ORCAMENTOS_PRO] 🔄 SKU de Componente mudou para o item ${itemId}.`);
                    await db.delete(orcamentoListaExplodida).where(eq(orcamentoListaExplodida.orcamentoItemId, itemId));
                    await db.insert(orcamentoListaExplodida).values({
                        orcamentoItemId: itemId,
                        skuComponenteId: updates.skuComponenteId,
                        quantidadeCalculada: (updates.quantidade || oldItem.quantidade).toString(),
                        quantidadeAjustada: (updates.quantidade || oldItem.quantidade).toString(),
                        custoUnitario: (updates.custoUnitarioCalculado || oldItem.custoUnitarioCalculado || 0).toString(),
                        origem: 'MANUAL'
                    });
                }

                // Limpar campos que não devem ser salvos diretamente ou que são auxiliares
                const cleanUpdates = { ...updates };
                delete cleanUpdates.skuId;
                delete cleanUpdates.skuTipo;

                await db.update(orcamentoItens).set(cleanUpdates).where(eq(orcamentoItens.id, itemId));
                await recalcularOrcamento(id);
                
                console.log(`[ORCAMENTOS_PRO] ✅ Item ${itemId} atualizado e orçamento recalculado.`);
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
            await auditLog('ORCAMENTO_PRO', id, 'DELETE', auth.user?.id || 'system');
            
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ success: false, error: 'Método não permitido' });
    } catch (err: any) {
        console.error(`[ORCAMENTOS_PRO] ❌ Erro geral no handler:`, err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
