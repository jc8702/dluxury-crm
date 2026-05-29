import { db } from './drizzle-db.js';
import { 
    skuEngenharia, skuComponente, 
    orcamentos, orcamentoItens, orcamentoListaExplodida 
} from '../db/schema/engenharia-orcamentos.js';
import { eq, sql as dsql, and, inArray, or, ilike } from 'drizzle-orm';
import { auditLog, validateAuth, sql } from './_db.js';

// Classe de erro customizada para validação
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO E TIPOS
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  MAX_BATCH_SIZE: 50,
  DEFAULT_MARGEM: 30,
  DEFAULT_VALIDADE_DIAS: 15,
  MAX_RETRY_ATTEMPTS: 3,
  QUERY_TIMEOUT_MS: 30000,
  LOG_LEVEL: process.env.NODE_ENV === 'production' ? 'error' : 'debug'
};

// Logger condicional para produção
const logger = {
  debug: (..._args: any[]) => CONFIG.LOG_LEVEL === 'debug' && /* console.log('[ORCAMENTOS_PRO]', ..._args) */ null,
  info: (..._args: any[]) => ['info', 'debug'].includes(CONFIG.LOG_LEVEL) && /* console.log('[ORCAMENTOS_PRO]', ..._args) */ null,
  warn: (...args: any[]) => console.warn('[ORCAMENTOS_PRO]', ...args),
  error: (...args: any[]) => console.error('[ORCAMENTOS_PRO]', ...args)
};

// Validadores reutilizáveis
const validators = {
  isValidUUID: (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  },
  
  isPositiveNumber: (value: any): boolean => {
    const num = Number(value);
    return !isNaN(num) && num >= 0;
  },
  
  sanitizeNumeric: (value: any, decimals: number = 2): string => {
    const num = parseFloat(value);
    return isNaN(num) ? '0'.padEnd(decimals + 2, '0') : num.toFixed(decimals);
  },
  
  sanitizeString: (value: any, maxLength: number = 255): string => {
    return String(value || '').trim().substring(0, maxLength);
  }
};

// Tipos para validação de payloads
interface CreateOrcamentoPayload {
  header: {
    clienteId?: string;
    projetoId?: string;
    validadeDias?: number;
    margemLucroPercentual?: number;
    taxaFinanceiraPercentual?: number;
    descontoPercentual?: number;
  };
  itens: Array<{
    skuEngenhariaId: string;
    quantidade: number;
  }>;
}

interface ImportItemPayload {
  nome: string;
  quantidade: number;
  sku_id?: string;
  produto_id?: string;
  custoUnitario?: number;
  largura?: string;
  altura?: string;
  espessura?: string;
  material?: string;
  match_sugerido?: {
    sku_componente_id?: string;
    sku_codigo?: string;
    nome?: string;
    custoUnitario?: number;
  };
}

/**
 * SERVIÇO DE ORÇAMENTOS PROFISSIONAIS - INTEGRADO
 */

/**
 * Explode BOM com validação prévia e cache
 * @throws {Error} Se SKU não existir ou não tiver componentes
 */
export async function explodirBOM(skuEngId: string, qtdItem: number = 1, tenantId: string = '00000000-0000-0000-0000-000000000000') {
  if (!validators.isValidUUID(skuEngId)) {
    throw new Error(`SKU inválido: ${skuEngId}`);
  }

  if (!validators.isPositiveNumber(qtdItem)) {
    throw new Error(`Quantidade inválida: ${qtdItem}`);
  }

  logger.debug(`🔍 Explodindo BOM para SKU ${skuEngId} (qtd: ${qtdItem})`);

  // Validar existência do SKU antes de explodir
  const skuExists = await db.query.skuEngenharia.findFirst({
    where: and(eq(skuEngenharia.id, skuEngId), eq(skuEngenharia.tenantId, tenantId))
  });

  if (!skuExists) {
    throw new Error(`SKU de Engenharia não encontrado: ${skuEngId}`);
  }

  const query = dsql`
    WITH RECURSIVE bom_recursivo AS (
      SELECT 
        bem.sku_montagem_id,
        bem.quantidade::numeric as quantidade_acumulada,
        1 AS nivel
      FROM bom_engenharia_montagem bem
      JOIN sku_engenharia se ON bem.sku_engenharia_id = se.id
      WHERE bem.sku_engenharia_id = ${skuEngId} AND se.tenant_id = ${tenantId}::uuid
      
      UNION ALL
      
      SELECT 
        bmc.sku_componente_id as sku_montagem_id,
        (br.quantidade_acumulada * bmc.quantidade * (1 + COALESCE(bmc.perda_percentual, 0)/100))::numeric,
        br.nivel + 1
      FROM bom_recursivo br
      JOIN bom_montagem_componente bmc ON bmc.sku_montagem_id = br.sku_montagem_id
      WHERE br.nivel < 10  -- Proteção contra loops infinitos
    )
    SELECT 
      br.sku_componente_id as sku_componente_id,
      SUM(br.quantidade_acumulada) as quantidade_total,
      sc.nome,
      sc.codigo,
      COALESCE(sc.preco_unitario, 0)::numeric as preco_unitario
    FROM bom_recursivo br
    JOIN sku_componente sc ON sc.id = br.sku_componente_id AND sc.tenant_id = ${tenantId}::uuid
    WHERE br.nivel = 2
    GROUP BY br.sku_montagem_id, sc.nome, sc.codigo, sc.preco_unitario;
  `;

  const result = await db.execute(query);
  const rows = result.rows as any[];

  if (rows.length === 0) {
    logger.warn(`⚠️ SKU ${skuEngId} (${skuExists.nome}) não possui componentes na BOM`);
    return [];
  }

  logger.debug(`✅ BOM explodida: ${rows.length} componentes únicos encontrados`);

  return rows.map(r => ({
    skuComponenteId: r.sku_componente_id,
    nome: validators.sanitizeString(r.nome, 500),
    codigo: validators.sanitizeString(r.codigo, 100),
    quantidadeCalculada: Number(r.quantidade_total) * qtdItem,
    custoUnitario: Number(r.preco_unitario),
    custoTotal: Number(r.quantidade_total) * qtdItem * Number(r.preco_unitario)
  }));
}

/**
 * Recalcula TODOS os valores do orçamento em UMA transação atômica
 * PERFORMANCE: Reduz de N+1 queries para 1 query em batch
 */
export async function recalcularOrcamento(orcId: string, tenantId: string = '00000000-0000-0000-0000-000000000000') {
  if (!validators.isValidUUID(orcId)) {
    throw new Error(`ID de orçamento inválido: ${orcId}`);
  }

  logger.info(`🔄 [RECALCULO] Iniciando para orçamento: ${orcId}`);

  return await db.transaction(async (tx) => {
    // Buscar configurações de precificação do tenant para taxas industriais/tributárias
    const configPrec = await tx.execute(dsql`
      SELECT 
        fator_perda_padrao, markup_padrao, aliquota_imposto, 
        mo_producao_pct_padrao, mo_instalacao_pct_padrao 
      FROM configuracoes_precificacao 
      WHERE tenant_id = ${tenantId}::uuid 
      LIMIT 1
    `);
    const conf = (configPrec?.rows?.[0] as any) || {};
    const fatorPerda = Number(conf.fator_perda_padrao || 0) / 100;
    const moProducao = Number(conf.mo_producao_pct_padrao || 0) / 100;
    const moInstalacao = Number(conf.mo_instalacao_pct_padrao || 0) / 100;
    const aliquotaImposto = Number(conf.aliquota_imposto || 0) / 100;

    // 1. Buscar orçamento e itens em UMA query com join
    const orc = await tx.query.orcamentos.findFirst({
      where: and(eq(orcamentos.id, orcId), eq(orcamentos.tenantId, tenantId)),
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

    if (!orc) {
      throw new Error(`Orçamento ${orcId} não encontrado`);
    }

    const margemGlobal = Number(orc.margemLucroPercentual || CONFIG.DEFAULT_MARGEM);
    const taxaFinanceira = Number(orc.taxaFinanceiraPercentual || 0);
    const desconto = Number(orc.descontoPercentual || 0);

    logger.debug(`⚙️ Config: Margem=${margemGlobal}% | Taxa=${taxaFinanceira}% | Desconto=${desconto}%`);

    // 2. Preparar updates em batch (evita loop com múltiplas queries)
    const itemUpdates: Array<{ id: string; custoCalc: string; precoVenda: string; margem: string }> = [];
    
    let custoTotalAcumulado = 0;
    let vendaTotalAcumulada = 0;

    for (const item of orc.itens) {
      const qtdItem = Number(item.quantidade || 1);
      
      // Calcular custo baseado na lista explodida
      let custoUnitario = 0;
      
      if (item.listaExplodida && item.listaExplodida.length > 0) {
        custoUnitario = item.listaExplodida.reduce((sum, comp) => {
          const qtdComp = Number(comp.quantidadeAjustada || comp.quantidadeCalculada || 0);
          const custoComp = Number(comp.custoUnitario || 0);
          return sum + (qtdComp * custoComp);
        }, 0);
      } else {
        // Fallback: usar custo já calculado (importante para itens importados/avulsos)
        custoUnitario = Number(item.custoUnitarioCalculado || item.custoBaseEstoque || 0);
      }

      // Aplicar fator de perda padrão, mão de obra de fabricação e de instalação
      const custoAjustado = custoUnitario * (1 + fatorPerda) * (1 + moProducao) * (1 + moInstalacao);

      // Calcular preço de venda
      let precoVenda = 0;
      let margemReal = margemGlobal;

      if (item.possuiOverride && item.precoVendaSobrescrito) {
        // Override manual: preço fixo, margem real líquida recalculada (descontando imposto do preço final)
        precoVenda = Number(item.precoVendaSobrescrito);
        const precoSemImposto = precoVenda / (1 + aliquotaImposto);
        margemReal = custoAjustado > 0 ? ((precoSemImposto / custoAjustado) - 1) * 100 : 0;
      } else {
        // Cálculo padrão: markup comercial + taxa financeira + imposto sobre o preço de venda
        const baseVenda = custoAjustado * (1 + (margemGlobal / 100));
        const precoSemImposto = baseVenda * (1 + (taxaFinanceira / 100));
        precoVenda = precoSemImposto * (1 + aliquotaImposto);
        margemReal = margemGlobal;
      }

      // Acumular totais
      custoTotalAcumulado += custoAjustado * qtdItem;
      vendaTotalAcumulada += precoVenda * qtdItem;

      // Adicionar à fila de updates
      itemUpdates.push({
        id: item.id,
        custoCalc: validators.sanitizeNumeric(custoUnitario, 2),
        precoVenda: validators.sanitizeNumeric(precoVenda, 2),
        margem: validators.sanitizeNumeric(margemReal, 2)
      });
    }

    // 3. Executar updates em batch (1 query ao invés de N)
    if (itemUpdates.length > 0) {
      logger.debug(`💾 Atualizando ${itemUpdates.length} itens em batch...`);
      
      // Drizzle não suporta batch update nativo, fazemos em chunks
      const chunks = [];
      for (let i = 0; i < itemUpdates.length; i += CONFIG.MAX_BATCH_SIZE) {
        chunks.push(itemUpdates.slice(i, i + CONFIG.MAX_BATCH_SIZE));
      }

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(upd =>
            tx.update(orcamentoItens)
              .set({
                custoUnitarioCalculado: upd.custoCalc,
                precoVendaUnitario: upd.precoVenda,
                margemLucro: upd.margem,
                updatedAt: new Date()
              })
              .where(eq(orcamentoItens.id, upd.id))
          )
        );
      }
    }

    // 4. Aplicar desconto e atualizar cabeçalho
    const valorFinal = vendaTotalAcumulada * (1 - (desconto / 100));

    await tx.update(orcamentos)
      .set({
        valorTotalCusto: validators.sanitizeNumeric(custoTotalAcumulado, 2),
        valorTotalVenda: validators.sanitizeNumeric(valorFinal, 2),
        updatedAt: new Date()
      })
      .where(and(eq(orcamentos.id, orcId), eq(orcamentos.tenantId, tenantId)));

    logger.info(`✅ [RECALCULO OK] Custo: R$ ${custoTotalAcumulado.toFixed(2)} | Venda: R$ ${valorFinal.toFixed(2)}`);

    return {
      custoTotal: custoTotalAcumulado,
      vendaTotal: valorFinal,
      itensAtualizados: itemUpdates.length
    };
  });
}

/**
 * Validadores de payloads de entrada
 */
const payloadValidators = {
  createOrcamento: (body: any): CreateOrcamentoPayload => {
    if (!body || typeof body !== 'object') {
      throw new ValidationError('Payload inválido');
    }

    const header = body.header || {};
    const itens = body.itens || [];

    if (!Array.isArray(itens)) {
      throw new ValidationError('Campo "itens" deve ser um array');
    }

    // Validar cada item
    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      
      if (!item.skuEngenhariaId || !validators.isValidUUID(item.skuEngenhariaId)) {
        throw new ValidationError(`Item ${i}: skuEngenhariaId inválido`);
      }

      if (!validators.isPositiveNumber(item.quantidade)) {
        throw new ValidationError(`Item ${i}: quantidade deve ser positiva`);
      }
    }

    return {
      header: {
        clienteId: header.clienteId || null,
        projetoId: header.projetoId || null,
        validadeDias: Number(header.validadeDias) || CONFIG.DEFAULT_VALIDADE_DIAS,
        margemLucroPercentual: Number(header.margemLucroPercentual) || CONFIG.DEFAULT_MARGEM,
        taxaFinanceiraPercentual: Number(header.taxaFinanceiraPercentual) || 0,
        descontoPercentual: Number(header.descontoPercentual) || 0
      },
      itens: itens.map((it: any) => ({
        skuEngenhariaId: it.skuEngenhariaId,
        quantidade: Number(it.quantidade)
      }))
    };
  },

  importItems: (items: any[]): ImportItemPayload[] => {
    if (!Array.isArray(items)) {
      throw new ValidationError('Items deve ser um array');
    }

    if (items.length === 0) {
      throw new ValidationError('Nenhum item fornecido para importação');
    }

    if (items.length > 500) {
      throw new ValidationError('Máximo de 500 itens por importação');
    }

    return items.map((item, idx) => {
      if (!item.nome || typeof item.nome !== 'string') {
        throw new ValidationError(`Item ${idx}: campo "nome" obrigatório`);
      }

      if (!validators.isPositiveNumber(item.quantidade)) {
        throw new ValidationError(`Item ${idx}: quantidade inválida`);
      }

      return {
        nome: validators.sanitizeString(item.nome, 255),
        quantidade: Number(item.quantidade),
        sku_id: item.sku_id || item.produto_id,
        custoUnitario: item.custoUnitario ? Number(item.custoUnitario) : undefined,
        largura: item.largura?.toString(),
        altura: item.altura?.toString(),
        espessura: item.espessura?.toString(),
        material: validators.sanitizeString(item.material, 255),
        match_sugerido: item.match_sugerido
      };
    });
  }
};

// Rate limiting por usuário em memória
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 100;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(userId);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

record.count++;
  return true;
}

/** Reset rate limiter (para testes) */
export function _resetRateLimit() {
  rateLimitMap.clear();
}

export async function handleOrcamentosPro(req: any, res: any) {
    const { authorized, error, user } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';

    // Rate Limiting por usuário
    const userId = user?.id || 'anonymous';
    if (!checkRateLimit(userId)) {
        logger.warn(`🚫 Rate limit excedido para o usuário: ${userId}`);
        return res.status(429).json({ success: false, error: 'Limite de requisições excedido. Tente novamente mais tarde.' });
    }

    const { method } = req;
    const url = new URL(req.url, 'http://localhost');
    const id = url.searchParams.get('id');
    const action = url.searchParams.get('action');

    /**
     * Wrapper para retry em caso de deadlock (código 40P01 do Postgres)
     */
    async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= CONFIG.MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          return await fn();
        } catch (err: any) {
          lastError = err;

          // Deadlock detectado (PostgreSQL error code 40P01)
          if (err.code === '40P01' || err.message?.includes('deadlock')) {
            logger.warn(`⚠️ [${context}] Deadlock detectado (tentativa ${attempt}/${CONFIG.MAX_RETRY_ATTEMPTS})`);
            
            if (attempt < CONFIG.MAX_RETRY_ATTEMPTS) {
              const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              await new Promise(resolve => setTimeout(resolve, backoff));
              continue;
            }
          }

          // Erro não recuperável
          throw err;
        }
      }

      throw lastError || new Error(`${context}: Falha após ${CONFIG.MAX_RETRY_ATTEMPTS} tentativas`);
    }

    try {
        if (method === 'GET') {
            if (action === 'explode') {
                const skuId = url.searchParams.get('skuId');
                const qtd = Number(url.searchParams.get('qtd') || 1);
                const componentes = await explodirBOM(skuId!, qtd, tenantId);
                return res.status(200).json({ success: true, data: componentes });
            }

            if (action === 'search-skus') {
                const query = url.searchParams.get('q') || '';
                const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
                
                if (query.length < 2) {
                    return res.status(200).json({ success: true, data: [] });
                }

                logger.debug(`🔍 Buscando SKUs para: "${query}"`);

                try {
                    // Executar buscas em paralelo
                    const [comps, engs] = await Promise.all([
                        db.select({ 
                            id: skuComponente.id, 
                            codigo: skuComponente.codigo, 
                            nome: skuComponente.nome, 
                            precoUnitario: skuComponente.precoUnitario 
                         })
                        .from(skuComponente)
                        .where(and(
                            eq(skuComponente.tenantId, tenantId),
                            or(
                                ilike(skuComponente.codigo, `%${query}%`), 
                                ilike(skuComponente.nome, `%${query}%`)
                            )
                        ))
                        .limit(limit),

                        db.select({ 
                            id: skuEngenharia.id, 
                            codigo: skuEngenharia.codigo, 
                            nome: skuEngenharia.nome 
                        })
                        .from(skuEngenharia)
                        .where(and(
                            eq(skuEngenharia.tenantId, tenantId),
                            or(
                                ilike(skuEngenharia.codigo, `%${query}%`), 
                                ilike(skuEngenharia.nome, `%${query}%`)
                            )
                        ))
                        .limit(limit)
                    ]);

                    const results = [
                        ...comps.map(c => ({ 
                            ...c, 
                            precoUnitario: Number(c.precoUnitario || 0), 
                            tipo: 'COMPONENTE' 
                        })),
                        ...engs.map(e => ({ 
                            ...e, 
                            precoUnitario: 0, 
                            tipo: 'ENGENHARIA' 
                        }))
                    ];

                    logger.debug(`✅ ${results.length} resultados encontrados`);
                    return res.status(200).json({ success: true, data: results });

                } catch (err: any) {
                    logger.error('❌ Erro na busca de SKUs:', err);
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Erro na busca de SKUs' 
                    });
                }
            }

            if (id) {
                logger.info(`🔍 Buscando orçamento: ${id}`);
                let result;
                try {
                    result = await db.query.orcamentos.findFirst({
                        where: and(eq(orcamentos.id, id), eq(orcamentos.tenantId, tenantId)),
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
                    logger.error(`❌ Erro Crítico no Drizzle (findFirst):`, dbErr);
                    // Se falhar o findFirst complexo, tentamos um simples sem 'with' para recuperar o básico
                    result = await db.query.orcamentos.findFirst({ where: and(eq(orcamentos.id, id), eq(orcamentos.tenantId, tenantId)) });
                    if (result) {
                        logger.warn(`⚠️ Recuperado com busca simples. O erro de 'with' persiste.`);
                        (result as any)._error = dbErr.message;
                    } else {
                        throw dbErr;
                    }
                }

                // FALLBACK: Se não encontrou na tabela PRO, busca na tabela comercial legada
                if (!result) {
                    logger.info(`🔍 ID ${id} não encontrado na tabela PRO. Buscando na tabela comercial...`);
                    const oldOrc = (await sql`SELECT id, numero, cliente_id, projeto_id, created_at, status, valor_final, valor_base FROM orcamentos WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL`)[0];
                    
                    if (oldOrc) {
                        logger.info(`✅ Orçamento legado encontrado. Mapeando para formato PRO...`);
                        const oldItens = await sql`SELECT id, descricao, quantidade, largura_cm, altura_cm, material, valor_unitario, valor_total FROM itens_orcamento WHERE orcamento_id = ${id} AND tenant_id = ${tenantId}`;
                        
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
                    logger.warn(`⚠️ Orçamento ${id} não encontrado em nenhuma tabela.`);
                    return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });
                }

                logger.info(`✅ Orçamento ${id} carregado com ${result.itens?.length || 0} itens.`);
                return res.status(200).json({ success: true, data: result });
            }

            const q = url.searchParams.get('q') || '';
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const offset = (page - 1) * limit;

            let query = db.select().from(orcamentos).where(eq(orcamentos.tenantId, tenantId)).orderBy(dsql`${orcamentos.createdAt} DESC`);
            
            if (q) {
                query = db.select()
                    .from(orcamentos)
                    .where(and(eq(orcamentos.tenantId, tenantId), ilike(orcamentos.numeroOrcamento, `%${q}%`)))
                    .orderBy(dsql`${orcamentos.createdAt} DESC`) as any;
            }

            const total = await db.select({ count: dsql`count(*)` }).from(orcamentos).where(eq(orcamentos.tenantId, tenantId));
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
            logger.info("🆕 Criando novo orçamento...");

            try {
                // 1. Validar payload
                const validated = payloadValidators.createOrcamento(req.body);

                // 2. Executar criação em transação atômica
                const result = await withRetry(async () => {
                    return await db.transaction(async (tx) => {
                        // Criar cabeçalho
                        const [newOrc] = await tx.insert(orcamentos).values({
                            clienteId: validated.header.clienteId,
                            projetoId: validated.header.projetoId,
                            validadeDias: validated.header.validadeDias,
                            margemLucroPercentual: validated.header.margemLucroPercentual.toString(),
                            taxaFinanceiraPercentual: validated.header.taxaFinanceiraPercentual.toString(),
                            descontoPercentual: validated.header.descontoPercentual.toString(),
                            numeroOrcamento: `PRO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*9999).toString().padStart(4,'0')}`,
                            status: 'RASCUNHO',
                            tenantId: tenantId
                        }).returning();

                        logger.debug(`✅ Cabeçalho criado: ${newOrc.id}`);

                        // Inserir itens e explodir BOM em paralelo
                        const itemPromises = validated.itens.map(async (itemData) => {
                            const [newItem] = await tx.insert(orcamentoItens).values({
                                orcamentoId: newOrc.id,
                                skuEngenhariaId: itemData.skuEngenhariaId,
                                quantidade: itemData.quantidade.toString()
                            }).returning();

                            // Explodir BOM
                            const componentes = await explodirBOM(itemData.skuEngenhariaId, 1, tenantId);
                            
                            if (componentes.length > 0) {
                                await tx.insert(orcamentoListaExplodida).values(
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

                            return newItem;
                        });

                        await Promise.all(itemPromises);
                        logger.debug(`✅ ${itemPromises.length} itens inseridos com BOM explodida`);

                        return newOrc;
                    });
                }, 'CREATE_ORCAMENTO');

                // 3. Recalcular totais (APÓS commit da transação)
                await recalcularOrcamento(result.id, tenantId);
                
                // 4. Audit log
                await auditLog('ORCAMENTO_PRO', result.id, 'CREATE', user?.id || 'system');
                
                logger.info(`✅ Orçamento ${result.numeroOrcamento} criado com sucesso`);
                
                return res.status(201).json({ 
                    success: true, 
                    data: { 
                        id: result.id, 
                        numeroOrcamento: result.numeroOrcamento 
                    } 
                });

            } catch (err: any) {
                console.error("❌ [CRITICAL] POST /api/orcamentos-pro Error:", err);
                logger.error("❌ Erro ao criar orçamento:", err?.message || err);
                
                // Erros de validação retornam 400
                if (err instanceof ValidationError || err.name === 'ValidationError' || err?.message?.includes('inválido') || err?.message?.includes('obrigatório') || err?.message?.includes('positiva')) {
                    return res.status(400).json({ 
                        success: false, 
                        error: err?.message || 'Erro de validação' 
                    });
                }

                return res.status(500).json({ 
                    success: false, 
                    error: `Erro na criação: ${err?.message || 'Erro desconhecido'}` 
                });
            }
        }

        if (method === 'PUT') {
            if (!id) return res.status(400).json({ success: false, error: 'ID obrigatório' });

            try {
                return await withRetry(async () => {
                    // Verificar se o orçamento existe antes de qualquer PUT
                    let exists = await db.query.orcamentos.findFirst({ where: and(eq(orcamentos.id, id), eq(orcamentos.tenantId, tenantId)) });
                    
                    // FALLBACK DE MIGRAÇÃO: Se não existe na PRO, mas existe na legada, migramos agora.
                    if (!exists) {
                        logger.info(`🚀 Migrando orçamento ${id} da tabela legada para a PRO durante atualização...`);
                        const oldOrc = (await sql`SELECT id, numero, cliente_id, projeto_id, created_at, status, valor_final, valor_base FROM orcamentos WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL`)[0];
                        
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
                                    validadeDias: 15,
                                    tenantId: tenantId
                                }).returning();
                                exists = newPro;
                                logger.info(`✅ Orçamento ${id} migrado com sucesso.`);
                            } catch (migErr: any) {
                                logger.error(`❌ Falha na migração automática:`, migErr);
                                return res.status(500).json({ success: false, error: 'Erro ao migrar orçamento legado para o novo formato.' });
                            }
                        }
                    }

                    if (!exists) {
                        return res.status(404).json({ success: false, error: 'Orçamento não encontrado para atualização.' });
                    }

                    if (action === 'update-bom') {
                        const { bomId, quantidadeAjustada } = req.body;
                        
                        // Garantir que a lista explodida pertence a um item deste orçamento do tenant
                        const belongs = await db.select()
                            .from(orcamentoListaExplodida)
                            .join(orcamentoItens, eq(orcamentoListaExplodida.orcamentoItemId, orcamentoItens.id))
                            .where(and(eq(orcamentoListaExplodida.id, bomId), eq(orcamentoItens.orcamentoId, id)));
                        if (!belongs.length) throw new Error('Item da BOM não pertence a este orçamento');

                        await db.update(orcamentoListaExplodida)
                            .set({ quantidadeAjustada: quantidadeAjustada.toString(), editado: true })
                            .where(eq(orcamentoListaExplodida.id, bomId));
                        
                        await recalcularOrcamento(id, tenantId);
                        return res.status(200).json({ success: true });
                    }

                    if (action === 'add-item') {
                        const { skuId, quantidade } = req.body;
                        
                        await db.transaction(async (tx) => {
                            // Verificar se é um módulo (Engenharia)
                            const isEng = await tx.query.skuEngenharia.findFirst({ where: and(eq(skuEngenharia.id, skuId), eq(skuEngenharia.tenantId, tenantId)) });
                            
                            if (isEng) {
                                const [newItem] = await tx.insert(orcamentoItens).values({
                                    orcamentoId: id,
                                    skuEngenhariaId: skuId,
                                    quantidade: quantidade.toString()
                                }).returning();

                                const comps = await explodirBOM(skuId, 1, tenantId);
                                if (comps.length > 0) {
                                    await tx.insert(orcamentoListaExplodida).values(
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
                                const isComp = await tx.query.skuComponente.findFirst({ where: and(eq(skuComponente.id, skuId), eq(skuComponente.tenantId, tenantId)) });
                                if (isComp) {
                                    const [newItem] = await tx.insert(orcamentoItens).values({
                                        orcamentoId: id,
                                        skuEngenhariaId: null,
                                        quantidade: '1',
                                        observacoes: `ITEM AVULSO: ${isComp.nome}`
                                    }).returning();

                                    await tx.insert(orcamentoListaExplodida).values({
                                        orcamentoItemId: newItem.id,
                                        skuComponenteId: isComp.id,
                                        quantidadeCalculada: quantidade.toString(),
                                        quantidadeAjustada: quantidade.toString(),
                                        custoUnitario: isComp.precoUnitario?.toString() || '0',
                                        origem: 'DIRECT'
                                    });
                                }
                            }
                        });

                        await recalcularOrcamento(id, tenantId);
                        return res.status(200).json({ success: true });
                    }

                    if (action === 'import-items') {
                        logger.info(`📤 Iniciando importação em lote para orçamento ${id}`);
                        
                        try {
                            // 1. Validar payload
                            const validatedItems = payloadValidators.importItems(req.body?.items || []);
                            
                            logger.info(`... ${validatedItems.length} itens validados. Iniciando importação...`);

                            // 2. Coletar SKUs únicos para validação em batch
                            const skuIds = new Set<string>();
                            validatedItems.forEach(item => {
                                if (item.sku_id) skuIds.add(item.sku_id);
                                if (item.match_sugerido?.sku_componente_id) {
                                    skuIds.add(item.match_sugerido.sku_componente_id);
                                }
                            });

                            // 3. Buscar TODOS os SKUs em UMA query
                            const skuMap = new Map<string, any>();
                            
                            if (skuIds.size > 0) {
                                const skuArray = Array.from(skuIds);
                                
                                // Buscar componentes
                                const componentes = await db.select()
                                    .from(skuComponente)
                                    .where(and(inArray(skuComponente.id, skuArray), eq(skuComponente.tenantId, tenantId)));
                                
                                componentes.forEach(c => skuMap.set(c.id, { ...c, tipo: 'COMPONENTE' }));
                                
                                logger.debug(`✅ ${componentes.length} SKUs encontrados na tabela de componentes`);

                                // Buscar materiais (tabela legada) se necessário
                                try {
                                    const materialIds = skuArray.filter(id => !skuMap.has(id));
                                    if (materialIds.length > 0) {
                                        const materials = await db.execute(dsql`
                                            SELECT id::text, sku as codigo, nome, preco_custo::numeric as "precoUnitario" 
                                            FROM materiais 
                                            WHERE id::text = ANY(${dsql.raw(`ARRAY[${materialIds.map(id => `'${id}'`).join(',')}]`)}) AND tenant_id = ${tenantId}::uuid
                                        `);
                                        
                                        materials.rows.forEach((m: any) => skuMap.set(m.id, { ...m, tipo: 'MATERIAL' }));
                                        logger.debug(`✅ ${materials.rows.length} SKUs encontrados em materiais`);
                                    }
                                } catch (matErr: any) {
                                    logger.warn(`⚠️ Erro ao buscar materiais (prosseguindo):`, matErr.message);
                                }
                            }

                            // 4. Executar importação em transação
                            const report = await db.transaction(async (tx) => {
                                const stats = { success: 0, failed: 0, errors: [] as string[] };

                                // Preparar batch de inserções
                                const itemsToInsert: any[] = [];
                                const explodidasToInsert: any[] = [];

                                for (let i = 0; i < validatedItems.length; i++) {
                                    const item = validatedItems[i];
                                    const itemLabel = `Item #${i+1} (${item.nome})`;

                                    try {
                                        const skuId = item.sku_id || item.match_sugerido?.sku_componente_id || null;
                                        const skuData = skuId ? skuMap.get(skuId) : null;
                                        
                                        // Validar FK: só aceita SKU se for da tabela skuComponente
                                        const finalSkuComponenteId = (skuData && skuData.tipo === 'COMPONENTE') ? skuId : null;
                                        
                                        const custoBase = skuData?.precoUnitario 
                                            || item.match_sugerido?.custoUnitario 
                                            || item.custoUnitario 
                                            || 0;

                                        const itemPayload = {
                                            orcamentoId: id,
                                            nomeCustomizado: item.nome,
                                            quantidade: validators.sanitizeNumeric(item.quantidade, 3),
                                            largura: validators.sanitizeString(item.largura, 20),
                                            altura: validators.sanitizeString(item.altura, 20),
                                            espessura: validators.sanitizeString(item.espessura, 20),
                                            material: item.material,
                                            skuComponenteId: finalSkuComponenteId,
                                            skuCodigo: validators.sanitizeString(skuData?.codigo || item.match_sugerido?.sku_codigo, 100),
                                            skuDescricao: validators.sanitizeString(skuData?.nome || item.match_sugerido?.nome, 500),
                                            unidadeMedida: 'UN',
                                            custoBaseEstoque: validators.sanitizeNumeric(custoBase, 2),
                                            custoUnitarioCalculado: validators.sanitizeNumeric(custoBase, 2),
                                            precoVendaUnitario: validators.sanitizeNumeric(custoBase * 1.3, 2),
                                            origemDados: finalSkuComponenteId ? 'SKU_MATCH' : 'CSV',
                                            possuiOverride: false,
                                            observacoes: `Importado via CSV em ${new Date().toLocaleDateString('pt-BR')}`
                                        };

                                        itemsToInsert.push(itemPayload);
                                        stats.success++;

                                    } catch (itemErr: any) {
                                        stats.failed++;
                                        stats.errors.push(`${itemLabel}: ${itemErr.message}`);
                                        logger.error(`❌ ${itemLabel}:`, itemErr.message);
                                    }
                                }

                                // 5. Inserir todos os itens em batch
                                if (itemsToInsert.length > 0) {
                                    const insertedItems = await tx.insert(orcamentoItens)
                                        .values(itemsToInsert)
                                        .returning();

                                    logger.debug(`✅ ${insertedItems.length} itens inseridos em batch`);

                                    // 6. Criar lista explodida para itens com SKU
                                    for (let i = 0; i < insertedItems.length; i++) {
                                        const item = insertedItems[i];
                                        const originalData = itemsToInsert[i];

                                        if (originalData.skuComponenteId) {
                                            explodidasToInsert.push({
                                                orcamentoItemId: item.id,
                                                skuComponenteId: originalData.skuComponenteId,
                                                quantidadeCalculada: item.quantidade,
                                                quantidadeAjustada: item.quantidade,
                                                custoUnitario: originalData.custoBaseEstoque,
                                                origem: 'IMPORT'
                                            });
                                        }
                                    }

                                    if (explodidasToInsert.length > 0) {
                                        await tx.insert(orcamentoListaExplodida).values(explodidasToInsert);
                                        logger.debug(`✅ ${explodidasToInsert.length} componentes adicionados à lista explodida`);
                                    }
                                }

                                return stats;
                            });

                            // 7. Recalcular totais
                            if (report.success > 0) {
                                logger.info(`🧮 Recalculando totais para ${report.success} itens importados...`);
                                await recalcularOrcamento(id, tenantId);
                            }

                            // 8. Retornar relatório
                            if (report.failed === validatedItems.length) {
                                return res.status(500).json({ 
                                    success: false, 
                                    error: 'Todos os itens falharam na importação.',
                                    details: report.errors 
                                });
                            }

                            logger.info(`✅ Importação concluída: ${report.success} sucessos, ${report.failed} falhas`);

                            return res.status(200).json({ 
                                success: true, 
                                data: {
                                    message: `Importação concluída: ${report.success} sucessos, ${report.failed} falhas.`,
                                    total: validatedItems.length,
                                    success: report.success,
                                    failed: report.failed,
                                    errors: report.errors
                                }
                            });

                        } catch (err: any) {
                            logger.error("❌ Erro crítico na importação:", err);
                            
                            if (err instanceof ValidationError || err.name === 'ValidationError' || err?.message?.includes('inválido') || err?.message?.includes('máximo') || err?.message?.includes('obrigatório') || err?.message?.includes('deve ser') || err?.message?.includes('quantidade')) {
                                return res.status(400).json({ success: false, error: err?.message || 'Erro de validação' });
                            }

                            return res.status(500).json({ 
                                success: false, 
                                error: `Erro crítico: ${err?.message || 'Erro desconhecido'}` 
                            });
                        }
                    }

                    if (action === 'reset-to-global-margin') {
                        const { itemIds } = req.body;
                        if (!Array.isArray(itemIds) || itemIds.length === 0) throw new Error('Nenhum item selecionado');
                        
                        await db.update(orcamentoItens)
                            .set({ possuiOverride: false, precoVendaSobrescrito: null })
                            .where(and(eq(orcamentoItens.orcamentoId, id), inArray(orcamentoItens.id, itemIds)));
                        
                        await recalcularOrcamento(id, tenantId);
                        return res.status(200).json({ success: true });
                    }

                    if (action === 'apply-global-margin') {
                        const { margem } = req.body;
                        if (typeof margem !== 'number') throw new Error('Margem inválida');

                        // Atualizar cabeçalho e resetar overrides sob transação
                        await db.transaction(async (tx) => {
                            await tx.update(orcamentos)
                                .set({ margemLucroPercentual: margem.toString() })
                                .where(and(eq(orcamentos.id, id), eq(orcamentos.tenantId, tenantId)));
                            
                            await tx.update(orcamentoItens)
                                .set({ possuiOverride: false, precoVendaSobrescrito: null })
                                .where(eq(orcamentoItens.orcamentoId, id));
                        });

                        await recalcularOrcamento(id, tenantId);
                        
                        const count = await db.select({ count: dsql`count(*)` }).from(orcamentoItens).where(eq(orcamentoItens.orcamentoId, id));
                        
                        return res.status(200).json({ 
                            success: true, 
                            message: `Margem de ${margem}% aplicada a ${count[0].count} itens` 
                        });
                    }

                    if (action === 'bulk-update-items') {
                        const { itemIds, updates } = req.body;
                        if (!Array.isArray(itemIds) || itemIds.length === 0) throw new Error('Nenhum item selecionado');

                        // Aplicar atualizações em lote buscando todos de uma vez
                        await db.transaction(async (tx) => {
                            const items = await tx.select()
                                .from(orcamentoItens)
                                .where(and(eq(orcamentoItens.orcamentoId, id), inArray(orcamentoItens.id, itemIds)));

                            for (const item of items) {
                                const finalUpdates = { ...updates };

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

                                await tx.update(orcamentoItens).set(finalUpdates).where(eq(orcamentoItens.id, item.id));
                            }
                        });

                        await recalcularOrcamento(id, tenantId);
                        return res.status(200).json({ success: true });
                    }

                    if (action === 'update-sku') {
                        const { itemId, skuId, tipo } = req.body;
                        
                        await db.transaction(async (tx) => {
                            const item = await tx.query.orcamentoItens.findFirst({ where: eq(orcamentoItens.id, itemId) });
                            if (!item) throw new Error('Item não encontrado');

                            if (tipo === 'ENGENHARIA') {
                                // Se for módulo, limpa a explodida antiga e gera a nova
                                await tx.delete(orcamentoListaExplodida).where(eq(orcamentoListaExplodida.orcamentoItemId, itemId));
                                const comps = await explodirBOM(skuId, 1, tenantId);
                                
                                if (comps.length > 0) {
                                    await tx.insert(orcamentoListaExplodida).values(
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

                                await tx.update(orcamentoItens).set({ 
                                    skuEngenhariaId: skuId,
                                    material: null 
                                }).where(eq(orcamentoItens.id, itemId));
                            } else {
                                // Se for componente direto
                                const comp = await tx.query.skuComponente.findFirst({ where: and(eq(skuComponente.id, skuId), eq(skuComponente.tenantId, tenantId)) });
                                if (!comp) throw new Error('Componente não encontrado');

                                await tx.delete(orcamentoListaExplodida).where(eq(orcamentoListaExplodida.orcamentoItemId, itemId));
                                await tx.insert(orcamentoListaExplodida).values({
                                    orcamentoItemId: itemId,
                                    skuComponenteId: skuId,
                                    quantidadeCalculada: '1',
                                    quantidadeAjustada: '1',
                                    custoUnitario: comp.precoUnitario,
                                    origem: 'MANUAL'
                                });

                                await tx.update(orcamentoItens).set({ 
                                    skuEngenhariaId: null,
                                    material: comp.codigo,
                                    custoUnitarioCalculado: comp.precoUnitario
                                }).where(eq(orcamentoItens.id, itemId));
                            }
                        });

                        await recalcularOrcamento(id, tenantId);
                        logger.info(`✅ SKU atualizado com sucesso para o item ${itemId}. Custo recalculado.`);
                        return res.status(200).json({ success: true });
                    }

                    if (action === 'update-item') {
                        const { itemId, ...updates } = req.body;
                        logger.info(`[ORCAMENTOS_PRO] 📝 Atualizando item ${itemId}:`, JSON.stringify(updates, null, 2));
                        
                        await db.transaction(async (tx) => {
                            // Buscar item atual para comparar SKU
                            const oldItem = await tx.query.orcamentoItens.findFirst({ where: eq(orcamentoItens.id, itemId) });
                            
                            if (!oldItem) {
                                throw new Error('Item não encontrado');
                            }

                            // Normalização de SKUs para garantir persistência correta
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
                                logger.info(`[ORCAMENTOS_PRO] 🔄 SKU de Engenharia mudou. Re-explodindo BOM para item ${itemId}...`);
                                await tx.delete(orcamentoListaExplodida).where(eq(orcamentoListaExplodida.orcamentoItemId, itemId));
                                const comps = await explodirBOM(updates.skuEngenhariaId, 1, tenantId);
                                
                                if (comps.length > 0) {
                                    await tx.insert(orcamentoListaExplodida).values(
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
                                logger.info(`[ORCAMENTOS_PRO] 🔄 SKU de Componente mudou para o item ${itemId}.`);
                                await tx.delete(orcamentoListaExplodida).where(eq(orcamentoListaExplodida.orcamentoItemId, itemId));
                                await tx.insert(orcamentoListaExplodida).values({
                                    orcamentoItemId: itemId,
                                    skuComponenteId: updates.skuComponenteId,
                                    quantidadeCalculada: (updates.quantidade || oldItem.quantidade).toString(),
                                    quantidadeAjustada: (updates.quantidade || oldItem.quantidade).toString(),
                                    custoUnitario: (updates.custoUnitarioCalculado || oldItem.custoUnitarioCalculado || 0).toString(),
                                    origem: 'MANUAL'
                                });
                            }

                            // Limpar campos auxiliares
                            const cleanUpdates = { ...updates };
                            delete cleanUpdates.skuId;
                            delete cleanUpdates.skuTipo;

                            await tx.update(orcamentoItens).set(cleanUpdates).where(eq(orcamentoItens.id, itemId));
                        });

                        await recalcularOrcamento(id, tenantId);
                        logger.info(`[ORCAMENTOS_PRO] ✅ Item ${itemId} atualizado e orçamento recalculado.`);
                        return res.status(200).json({ success: true });
                    }

                    if (action === 'delete-item') {
                        const { itemId } = req.body;
                        await db.delete(orcamentoItens).where(and(eq(orcamentoItens.id, itemId), eq(orcamentoItens.orcamentoId, id)));
                        await recalcularOrcamento(id, tenantId);
                        return res.status(200).json({ success: true });
                    }

                    // Update Header se não tiver nenhuma action
                    if (req.body.status === 'APROVADO') {
                        if (exists && exists.status !== 'APROVADO') {
                            await db.transaction(async (tx) => {
                                // 1. Atualizar status e cabeçalho do orçamento
                                const finalBody = { ...req.body, updatedAt: new Date() };
                                await tx.update(orcamentos)
                                    .set(finalBody)
                                    .where(and(eq(orcamentos.id, id), eq(orcamentos.tenantId, tenantId)));
                                
                                // 2. FASE 1: Gerar Títulos a Receber (Financeiro)
                                const condId = req.body.condicaoPagamentoId || exists.condicaoPagamentoId;
                                let totalParcelas = 1;
                                
                                if (condId) {
                                    const cond = await tx.execute(dsql`
                                        SELECT parcelas FROM condicoes_pagamento 
                                        WHERE id = ${condId}::uuid AND tenant_id = ${tenantId}::uuid 
                                        LIMIT 1
                                    `);
                                    if (cond.rows.length > 0) {
                                        totalParcelas = Number((cond.rows[0] as any).parcelas || 1);
                                    }
                                }

                                const valorTotal = Number(exists.valorTotalVenda) || 0;
                                const valorParcela = valorTotal / totalParcelas;
                                const dataEmissao = new Date();
                                
                                // Buscar classe financeira e forma de recebimento padrão do tenant
                                const classResult = await tx.execute(dsql`
                                    SELECT id FROM classes_financeiras 
                                    WHERE tenant_id = ${tenantId}::uuid 
                                    ORDER BY codigo ASC LIMIT 1
                                `);
                                const defaultClassId = classResult.rows[0]?.id || null;

                                const formaResult = await tx.execute(dsql`
                                    SELECT id FROM formas_pagamento 
                                    WHERE tenant_id = ${tenantId}::uuid 
                                    LIMIT 1
                                `);
                                const defaultFormaId = formaResult.rows[0]?.id || null;

                                if (defaultClassId && defaultFormaId && exists.clienteId) {
                                    for (let i = 1; i <= totalParcelas; i++) {
                                        const vencimento = new Date();
                                        vencimento.setMonth(vencimento.getMonth() + (i - 1));
                                        const numeroTitulo = `REC-PRO-${exists.numeroOrcamento}-${i}`;
                                        
                                        await tx.execute(dsql`
                                            INSERT INTO titulos_receber (
                                                numero_titulo, cliente_id, orcamento_id,
                                                valor_original, valor_liquido, valor_aberto,
                                                data_emissao, data_vencimento, data_competencia,
                                                classe_financeira_id, forma_recebimento_id,
                                                status, parcela, total_parcelas, tenant_id
                                            ) VALUES (
                                                ${numeroTitulo}, 
                                                ${exists.clienteId}::text, 
                                                ${id}::uuid,
                                                ${valorParcela.toFixed(2)}, ${valorParcela.toFixed(2)}, ${valorParcela.toFixed(2)},
                                                ${dataEmissao}, ${vencimento}, ${dataEmissao},
                                                ${defaultClassId}::uuid, ${defaultFormaId}::uuid,
                                                'aberto', ${i}, ${totalParcelas}, ${tenantId}::uuid
                                            )
                                            ON CONFLICT (numero_titulo) DO NOTHING
                                        `);
                                    }
                                }

                                // 3. FASE 2: Gerar PCP (Ordens de Produção)
                                const itens = await tx.query.orcamentoItens.findMany({
                                    where: eq(orcamentoItens.orcamentoId, id),
                                    with: {
                                        listaExplodida: {
                                            with: {
                                                componente: true
                                            }
                                        }
                                    }
                                });

                                for (const item of itens) {
                                    if (item.skuEngenhariaId) {
                                        const opId = `OP-${exists.numeroOrcamento}-${Math.floor(1000 + Math.random() * 9000)}`;
                                        
                                        // Mapear peças explodidas da BOM
                                        const pecas = item.listaExplodida.map((l: any) => ({
                                            sku: l.componente?.codigo || l.skuComponenteId,
                                            nome: l.componente?.nome || 'Insumo',
                                            quantidade: l.quantidadeAjustada || l.quantidadeCalculada,
                                            custoUnitario: l.custoUnitario
                                        }));

                                        await tx.execute(dsql`
                                            INSERT INTO ordens_producao (
                                                op_id, produto, pecas, status, orcamento_id, tenant_id
                                            ) VALUES (
                                                ${opId}, 
                                                ${item.nomeCustomizado || 'Módulo de Engenharia'}, 
                                                ${JSON.stringify(pecas)}::jsonb, 
                                                'AGUARDANDO', 
                                                ${id}, 
                                                ${tenantId}::uuid
                                            )
                                        `);

                                        // 4. FASE 3: Reservar Estoque (Comercial)
                                        for (const peca of pecas) {
                                            if (peca.sku) {
                                                // Buscar o material correspondente no estoque comercial
                                                const matResult = await tx.execute(dsql`
                                                    SELECT id, estoque_atual, preco_custo::numeric as preco_custo 
                                                    FROM materiais 
                                                    WHERE LOWER(sku) = LOWER(${peca.sku}) AND tenant_id = ${tenantId}::uuid 
                                                    LIMIT 1
                                                `);
                                                
                                                if (matResult.rows.length > 0) {
                                                    const mat = matResult.rows[0] as any;
                                                    const qtd = Number(peca.quantidade);
                                                    const custo = Number(peca.custoUnitario || mat.preco_custo || 0);
                                                    
                                                    await tx.execute(dsql`
                                                        INSERT INTO movimentacoes_estoque (
                                                            material_id, tipo, quantidade, motivo, orcamento_id,
                                                            preco_unitario, valor_total, estoque_antes, estoque_depois,
                                                            created_by, tenant_id
                                                        ) VALUES (
                                                            ${mat.id},
                                                            'saida_reserva',
                                                            ${qtd},
                                                            ${`Reserva automática OP ${opId} - Orçamento ${exists.numeroOrcamento}`},
                                                            ${id}::uuid,
                                                            ${custo},
                                                            ${qtd * custo},
                                                            ${mat.estoque_atual || 0},
                                                            ${mat.estoque_atual || 0},
                                                            'SISTEMA',
                                                            ${tenantId}::uuid
                                                        )
                                                    `);
                                                }
                                            }
                                        }
                                    }
                                }

                                // 5. FASE 1: Gerar Kanban de Produção (ordens_prod e etapas_prod_kanban)
                                const numeroOp = `OP-${exists.numeroOrcamento || exists.id.substring(0,8)}-${Math.floor(1000 + Math.random() * 9000)}`;
                                const dataPrazo = exists.dataOrcamento ? new Date(exists.dataOrcamento) : new Date();
                                const prazoDias = parseInt(String(exists.prazoEntregaDias || '30'), 10);
                                dataPrazo.setDate(dataPrazo.getDate() + prazoDias);

                                const opResult = await tx.execute(dsql`
                                    INSERT INTO ordens_prod (
                                        id, tenant_id, orcamento_id, numero_op, status, prioridade, data_prazo, observacoes
                                    ) VALUES (
                                        gen_random_uuid(),
                                        ${tenantId}::uuid,
                                        ${id}::uuid,
                                        ${numeroOp},
                                        'planejamento',
                                        5,
                                        ${dataPrazo.toISOString().split('T')[0]},
                                        null
                                    )
                                    RETURNING id
                                `);

                                const newOpId = opResult.rows[0]?.id;

                                if (newOpId) {
                                    const etapasPadrao = [
                                        { numero: 1, nome: 'MEDIÇÃO' },
                                        { numero: 2, nome: 'PROJETO' },
                                        { numero: 3, nome: 'PRODUÇÃO' },
                                        { numero: 4, nome: 'MONTAGEM' },
                                        { numero: 5, nome: 'ENTREGA' }
                                    ];

                                    for (const et of etapasPadrao) {
                                        await tx.execute(dsql`
                                            INSERT INTO etapas_prod_kanban (
                                                tenant_id, operacao_prod_id, etapa_numero, etapa_nome, status_kanban, ordem_display
                                            ) VALUES (
                                                ${tenantId}::uuid,
                                                ${newOpId}::uuid,
                                                ${et.numero},
                                                ${et.nome},
                                                'a_fazer',
                                                ${et.numero}
                                            )
                                        `);
                                    }

                                    // Criar eventos automáticos de calendário para prazos da OP
                                    const usuarios = await tx.execute(dsql`
                                        SELECT id FROM users 
                                        WHERE tenant_id = ${tenantId}::uuid
                                    `);

                                    for (const u of usuarios.rows) {
                                        const userId = (u as any).id;
                                        await tx.execute(dsql`
                                            INSERT INTO eventos_calendario (
                                                tenant_id, usuario_id, tipo_evento, titulo, descricao, data_evento, operacao_prod_id, cor_categoria, concluido, notificacao_dias_antes
                                            ) VALUES (
                                                ${tenantId}::uuid,
                                                ${userId}::uuid,
                                                'prazo_entrega',
                                                ${`Prazo de Entrega OP: ${numeroOp}`},
                                                ${`Ordem de Produção gerada a partir do Orçamento ${exists.numeroOrcamento}`},
                                                ${dataPrazo.toISOString().split('T')[0]},
                                                ${newOpId}::uuid,
                                                '#DC2626',
                                                FALSE,
                                                3
                                            )
                                        `);
                                    }
                                }
                            });
                        } else {
                            await db.update(orcamentos).set(req.body).where(and(eq(orcamentos.id, id), eq(orcamentos.tenantId, tenantId)));
                        }
                    } else {
                        await db.update(orcamentos).set(req.body).where(and(eq(orcamentos.id, id), eq(orcamentos.tenantId, tenantId)));
                    }
                    
                    await recalcularOrcamento(id, tenantId);
                    return res.status(200).json({ success: true });
                }, 'UPDATE_ORCAMENTO');
            } catch (err: any) {
                logger.error(`❌ Erro no PUT do orçamento ${id}:`, err);
                return res.status(500).json({ success: false, error: err.message });
            }
        }

        if (method === 'DELETE') {
            if (!id) return res.status(400).json({ success: false, error: 'ID obrigatório' });
            
            try {
                return await withRetry(async () => {
                    await db.delete(orcamentos).where(and(eq(orcamentos.id, id), eq(orcamentos.tenantId, tenantId)));
                    await auditLog('ORCAMENTO_PRO', id, 'DELETE', user?.id || 'system');
                    return res.status(200).json({ success: true });
                }, 'DELETE_ORCAMENTO');
            } catch (err: any) {
                logger.error(`❌ Erro ao deletar orçamento ${id}:`, err);
                return res.status(500).json({ success: false, error: err.message });
            }
        }

        return res.status(405).json({ success: false, error: 'Método não permitido' });
    } catch (err: any) {
        logger.error(`[ORCAMENTOS_PRO] ❌ Erro geral no handler:`, err);
        if (err instanceof ValidationError || err.name === 'ValidationError') {
            return res.status(400).json({ success: false, error: err.message });
        }
        return res.status(500).json({ success: false, error: err.message });
    }
}
