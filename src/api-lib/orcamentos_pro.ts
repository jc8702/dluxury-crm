import { db } from './drizzle-db.js';
import { 
    skuEngenharia, skuMontagem, skuComponente, 
    bomEngenhariaMontagem, bomMontagemComponente,
    orcamentos, orcamentoItens, orcamentoListaExplodida 
} from '../db/schema/engenharia-orcamentos.js';
import { eq, sql } from 'drizzle-orm';
import { auditLog, validateAuth } from './_db.js';

/**
 * SERVIÇO DE ORÇAMENTOS PROFISSIONAIS
 */

/**
 * Explode um SKU de Engenharia em seus componentes finais via BOM
 */
export async function explodirBOM(skuEngId: string, qtdItem: number = 1) {
    // 1. Buscar montagens ligadas a este SKU Engenharia
    const montagens = await db.select({
        montagemId: bomEngenhariaMontagem.skuMontagemId,
        qtdMontagem: bomEngenhariaMontagem.quantidade,
    }).from(bomEngenhariaMontagem)
    .where(eq(bomEngenhariaMontagem.skuEngenhariaId, skuEngId));

    const listaComponentes: any[] = [];

    for (const m of montagens) {
        if (!m.montagemId) continue;

        // 2. Buscar componentes desta montagem
        const componentes = await db.select({
            compId: bomMontagemComponente.skuComponenteId,
            qtdComp: bomMontagemComponente.quantidade,
            perda: bomMontagemComponente.perdaPercentual,
            nome: skuComponente.nome,
            preco: skuComponente.precoUnitario,
        }).from(bomMontagemComponente)
        .innerJoin(skuComponente, eq(bomMontagemComponente.skuComponenteId, skuComponente.id))
        .where(eq(bomMontagemComponente.skuMontagemId, m.montagemId));

        for (const c of componentes) {
            const qtdFinal = Number(m.qtdMontagem) * Number(c.qtdComp) * qtdItem;
            // Aplicar perda
            const qtdComPerda = qtdFinal * (1 + Number(c.perda) / 100);

            listaComponentes.push({
                skuComponenteId: c.compId,
                nome: c.nome,
                quantidadeCalculada: qtdComPerda,
                custoUnitario: Number(c.preco),
                custoTotal: qtdComPerda * Number(c.preco)
            });
        }
    }

    return listaComponentes;
}

export async function handleOrcamentosPro(req: any, res: any) {
    const auth = await validateAuth(req);
    if (!auth) return res.status(401).json({ success: false, error: 'Não autorizado' });

    const { method } = req;
    const url = new URL(req.url, 'http://localhost');
    const id = url.searchParams.get('id');

    try {
        if (method === 'GET') {
            if (id) {
                const orc = await db.query.orcamentos.findFirst({
                    where: eq(orcamentos.id, id),
                    with: {
                        itens: {
                            with: {
                                listaExplodida: {
                                    with: {
                                        componente: true
                                    }
                                }
                            }
                        }
                    }
                });
                return res.status(200).json({ success: true, data: orc });
            }
            const list = await db.select().from(orcamentos).orderBy(sql`${orcamentos.createdAt} DESC`);
            return res.status(200).json({ success: true, data: list });
        }

        if (method === 'POST') {
            const { header, itens } = req.body;

            // 1. Criar cabeçalho
            const [newOrc] = await db.insert(orcamentos).values({
                ...header,
                numeroOrcamento: `PRO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*9999).toString().padStart(4,'0')}`,
                status: 'RASCUNHO'
            }).returning();

            // 2. Processar itens e explodir BOM
            for (const item of itens) {
                const [newItem] = await db.insert(orcamentoItens).values({
                    orcamentoId: newOrc.id,
                    skuEngenhariaId: item.skuEngenhariaId,
                    quantidade: item.quantidade,
                    observacoes: item.observacoes
                }).returning();

                // EXPLOSÃO AUTOMÁTICA DO BOM
                const componentes = await explodirBOM(item.skuEngenhariaId, Number(item.quantidade));
                
                if (componentes.length > 0) {
                    await db.insert(orcamentoListaExplodida).values(
                        componentes.map(c => ({
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

            await auditLog('ORCAMENTO_PRO', newOrc.id, 'CREATE', auth.user?.id || 'system');

            // Retornar o orçamento completo criado
            const fullOrc = await db.query.orcamentos.findFirst({
                where: eq(orcamentos.id, newOrc.id),
                with: {
                    itens: {
                        with: {
                            listaExplodida: {
                                with: {
                                    componente: true
                                }
                            }
                        }
                    }
                }
            });

            return res.status(201).json({ success: true, data: fullOrc });
        }

        return res.status(405).json({ success: false, error: 'Método não permitido' });
    } catch (err: any) {
        console.error('[API ORÇAMENTOS PRO]', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
