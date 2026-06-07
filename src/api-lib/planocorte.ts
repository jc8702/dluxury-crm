import { db } from './drizzle-db.js';
import {
  planosDeCorte,
  erpChapas,
  retalhosEstoque,
  movimentacoesEstoque,
} from '../db/schema/planos-de-corte.js';
import { skuEngenharia } from '../db/schema/skus.js';
import { eq, ilike, or, isNull, and, sql } from 'drizzle-orm';
import { auditLog, sql as rawSql } from './_db.js';
import { withTenant, type TenantHandler } from './middleware/tenantMiddleware.js';
import { logger } from './logger.js';

function safeUuid(val: any): string | null {
  if (!val || typeof val !== 'string') return null;
  const cleaned = val.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(cleaned) ? cleaned : null;
}

async function proximoSkuRetalho(tenantId: string): Promise<string> {
  const result = await rawSql`
    SELECT COALESCE(MAX(CAST(SUBSTRING(sku, 5) AS INTEGER)), 0) + 1 AS prox
    FROM retalhos_estoque
    WHERE sku ~ '^RET-[0-9]+$' AND tenant_id = ${tenantId}
  `;
  const prox = result[0]?.prox || 1;
  return `RET-${String(prox).padStart(4, '0')}`;
}

/**
 * MÓDULO PLANO DE CORTE INDUSTRIAL - REESCRITA COM DRIZZLE
 */

// --- 1. Handler Principal (CRUD de Planos) ---
const handlePlanoCorteCore: TenantHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const user = req.tenantUser;

  const method = req.method;
  const { id } = req.query || {};

  try {
    switch (method) {
      case 'GET':
        if (id) {
          const [plano] = await db
            .select()
            .from(planosDeCorte)
            .where(
              and(
                eq(planosDeCorte.id, id),
                eq(planosDeCorte.tenantId, tenantId),
                isNull(planosDeCorte.deleted_at),
              ),
            );
          if (!plano)
            return res.status(404).json({ success: false, error: 'PLANO NÃO ENCONTRADO' });
          return res.status(200).json({ success: true, data: plano });
        } else {
          const planos = await db
            .select()
            .from(planosDeCorte)
            .where(and(eq(planosDeCorte.tenantId, tenantId), isNull(planosDeCorte.deleted_at)));
          return res.status(200).json({ success: true, data: planos });
        }

      case 'POST': {
        // Criar ou Salvar Resultado
        const { action } = req.query || {};

        if (action === 'criar_plano') {
          const [novo] = await db
            .insert(planosDeCorte)
            .values({
              nome: req.body.nome,
              kerf_mm: req.body.kerf_mm || 3,
              materiais: req.body.materiais || [],
              sku_engenharia: req.body.sku_engenharia,
              visita_id: safeUuid(req.body.visita_id),
              projeto_id: safeUuid(req.body.projeto_id),
              quotation_id: safeUuid(req.body.quotation_id),
              ordem_producao_id: safeUuid(req.body.ordem_producao_id),
              tenantId: tenantId,
            })
            .returning();

          await auditLog('planos_de_corte', novo.id, 'CREATE', user?.id, null, novo);

          return res.status(201).json({ success: true, data: novo });
        } else if (action === 'verificar_retalhos_duplicados') {
          const { plano_id, retalhos_gerados } = req.body;
          if (
            !plano_id ||
            !retalhos_gerados ||
            !Array.isArray(retalhos_gerados) ||
            retalhos_gerados.length === 0
          ) {
            return res.status(200).json({ success: true, duplicados: [] });
          }

          const allExisting = await rawSql`
            SELECT largura_mm, altura_mm FROM retalhos_estoque
            WHERE plano_corte_origem_id = ${safeUuid(plano_id)} AND tenant_id = ${tenantId}
          `;
          const existingSet = new Set(
            allExisting.map((e: any) => `${e.largura_mm}-${e.altura_mm}`),
          );
          const duplicados = retalhos_gerados.filter((r: any) =>
            existingSet.has(`${r.largura_mm}-${r.altura_mm}`),
          );

          return res.status(200).json({ success: true, duplicados });
        } else if (action === 'aprovar_producao') {
          const { materiais_consumidos, retalhos_gerados, ignorar_retalhos_duplicados } = req.body;

          // 1. Processar Materiais Consumidos
          for (const item of materiais_consumidos) {
            if (item.id_retalho) {
              // Uso de Retalho Existente
              await db
                .update(retalhosEstoque)
                .set({
                  disponivel: false,
                  utilizado_em_id: safeUuid(item.plano_id),
                  data_utilizacao: new Date(),
                  updated_at: new Date(),
                })
                .where(
                  and(
                    eq(retalhosEstoque.id, item.id_retalho),
                    eq(retalhosEstoque.tenantId, tenantId),
                  ),
                );

              await db.insert(movimentacoesEstoque).values({
                tipo: 'uso_plano',
                item_tipo: 'retalho',
                retalho_id: safeUuid(item.id_retalho),
                plano_corte_id: safeUuid(item.plano_id),
                quantidade: 1,
                motivo: 'CONSUMO EM PRODUÇÃO',
                usuario_id: user?.id,
                tenantId: tenantId,
              });

              // Sincronizar saída com Módulo Estoque Principal (materiais / movimentacoes_estoque)
              const matRes =
                await rawSql`SELECT id, estoque_atual FROM materiais WHERE sku = (SELECT sku FROM retalhos_estoque WHERE id = ${safeUuid(item.id_retalho)} AND tenant_id = ${tenantId}) AND tenant_id = ${tenantId}`;
              if (matRes.length > 0) {
                const matId = matRes[0].id;
                await rawSql`UPDATE materiais SET estoque_atual = COALESCE(estoque_atual, 0) - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ${matId} AND tenant_id = ${tenantId}`;
                await rawSql`
                  INSERT INTO movimentacoes_estoque (material_id, tipo, item_tipo, quantidade, motivo, usuario_id, tenant_id)
                  VALUES (${matId}, 'saida', 'material', 1, 'CONSUMO DE RETALHO EM PRODUÇÃO', ${user?.id || null}, ${tenantId})
                `;
              }
            } else {
              // Uso de Chapa Inteira
              await db.execute(sql`
                UPDATE erp_chapas 
                SET estoque = COALESCE(estoque, 0) - ${item.qtd || 1} 
                WHERE sku = ${item.sku} AND tenant_id = ${tenantId}
              `);

              const chapaRecord = await db
                .select({ id: erpChapas.id })
                .from(erpChapas)
                .where(and(eq(erpChapas.sku, item.sku), eq(erpChapas.tenantId, tenantId)))
                .limit(1);

              await db.insert(movimentacoesEstoque).values({
                tipo: 'uso_plano',
                item_tipo: 'chapa',
                chapa_id:
                  chapaRecord.length > 0 && chapaRecord[0].id ? safeUuid(chapaRecord[0].id) : null,
                plano_corte_id: safeUuid(item.plano_id),
                quantidade: item.qtd || 1,
                motivo: `CONSUMO SKU: ${item.sku}`,
                usuario_id: user?.id,
                tenantId: tenantId,
              });

              // Sincronizar saída de Chapa Inteira com Módulo Estoque Principal (materiais / movimentacoes_estoque)
              const matRes =
                await rawSql`SELECT id, estoque_atual FROM materiais WHERE sku = ${item.sku} AND tenant_id = ${tenantId}`;
              if (matRes.length > 0) {
                const matId = matRes[0].id;
                const qtdConsumida = Number(item.qtd || 1);
                await rawSql`UPDATE materiais SET estoque_atual = COALESCE(estoque_atual, 0) - ${qtdConsumida}, updated_at = CURRENT_TIMESTAMP WHERE id = ${matId} AND tenant_id = ${tenantId}`;
                await rawSql`
                  INSERT INTO movimentacoes_estoque (material_id, tipo, item_tipo, quantidade, motivo, usuario_id, tenant_id)
                  VALUES (${matId}, 'saida', 'material', ${qtdConsumida}, 'CONSUMO DE CHAPA EM PRODUÇÃO (PLANO DE CORTE)', ${user?.id || null}, ${tenantId})
                `;
              }
            }
          }

          // 2. Gerar Novos Retalhos (Sobras Reutilizáveis)
          if (retalhos_gerados && Array.isArray(retalhos_gerados)) {
            // Agrupar retalhos idênticos
            const retalhosAgrupados: any[] = [];
            for (const r of retalhos_gerados) {
              if (ignorar_retalhos_duplicados && r.plano_corte_id) {
                const existeNoBanco =
                  await rawSql`SELECT id FROM retalhos_estoque WHERE plano_corte_origem_id = ${safeUuid(r.plano_corte_id)} AND largura_mm = ${r.largura_mm} AND altura_mm = ${r.altura_mm} AND tenant_id = ${tenantId} LIMIT 1`;
                if (existeNoBanco && existeNoBanco.length > 0) {
                  continue;
                }
              }

              const existente = retalhosAgrupados.find(
                (ra) =>
                  ra.largura_mm === r.largura_mm &&
                  ra.altura_mm === r.altura_mm &&
                  ra.espessura_mm === r.espessura_mm &&
                  ra.sku_chapa === r.sku_chapa,
              );
              if (existente) {
                existente.quantidade += r.quantidade || 1;
              } else {
                retalhosAgrupados.push({ ...r, quantidade: r.quantidade || 1 });
              }
            }

            for (const r of retalhosAgrupados) {
              const retalhoSku = await proximoSkuRetalho(tenantId);
              const [novoRetalho] = await db
                .insert(retalhosEstoque)
                .values({
                  sku: retalhoSku,
                  largura_mm: r.largura_mm,
                  altura_mm: r.altura_mm,
                  espessura_mm: r.espessura_mm,
                  sku_chapa: r.sku_chapa,
                  origem: 'sobra_plano_corte',
                  plano_corte_origem_id: safeUuid(r.plano_corte_id),
                  projeto_origem: r.projeto_origem || null,
                  usuario_criou: user?.id || 'sistema',
                  disponivel: true,
                  descartado: false,
                  metadata: { automatico: true },
                  tenantId: tenantId,
                })
                .returning();

              await db.insert(movimentacoesEstoque).values({
                tipo: 'entrada',
                item_tipo: 'retalho',
                retalho_id: novoRetalho.id || null,
                plano_corte_id: safeUuid(r.plano_corte_id),
                quantidade: r.quantidade,
                motivo: 'GERAÇÃO AUTOMÁTICA DE SOBRA',
                usuario_id: user?.id,
                tenantId: tenantId,
              });

              // Sincronizar entrada com Módulo Estoque Principal (materiais / movimentacoes_estoque)
              // Obter dados do material de origem (Chapa) para herdar informações e calcular o custo
              let preco_calculado = 0;
              let marca = null;
              let fornecedor = null;
              let ncm = null;
              let cfop = null;
              let categoria_id = null;
              let subcategoria = null;

              const resOrigem =
                await rawSql`SELECT preco_custo, largura_mm, altura_mm, marca, fornecedor_principal, ncm, cfop, categoria_id, subcategoria FROM materiais WHERE sku = ${r.sku_chapa} AND tenant_id = ${tenantId}`;
              const chapaInfo = Array.isArray(resOrigem) ? resOrigem[0] : null;

              if (chapaInfo) {
                marca = chapaInfo.marca;
                fornecedor = chapaInfo.fornecedor_principal;
                ncm = chapaInfo.ncm;
                cfop = chapaInfo.cfop;
                categoria_id = 'RET';
                subcategoria = chapaInfo.subcategoria;

                const pCusto = Number(chapaInfo.preco_custo) || 0;
                const lChapa = Number(chapaInfo.largura_mm) || 0;
                const aChapa = Number(chapaInfo.altura_mm) || 0;

                if (pCusto > 0 && lChapa > 0 && aChapa > 0) {
                  const areaChapa = lChapa * aChapa;
                  const areaRetalho = Number(r.largura_mm) * Number(r.altura_mm);
                  const proporcao = areaRetalho / areaChapa;
                  preco_calculado = Number((pCusto * proporcao).toFixed(2));
                }
              }

              const nomeRetalho = `RETALHO MDF ${r.espessura_mm}MM - ${r.largura_mm}X${r.altura_mm} (CHAPA: ${r.sku_chapa.toUpperCase()})`;
              const novoMat = await rawSql`
                INSERT INTO materiais (
                  sku, nome, descricao, unidade_compra, unidade_uso, fator_conversao, 
                  estoque_atual, ativo, largura_mm, altura_mm, preco_custo,
                  marca, fornecedor_principal, ncm, cfop, categoria_id, subcategoria, tenant_id
                )
                VALUES (
                  ${retalhoSku}, ${nomeRetalho}, 'SOBRA DE PLANO DE CORTE AUTOMATICA', 'UN', 'UN', 1, 
                  ${r.quantidade}, true, ${r.largura_mm}, ${r.altura_mm}, ${preco_calculado},
                  ${marca}, ${fornecedor}, ${ncm}, ${cfop}, ${categoria_id}, ${subcategoria}, ${tenantId}
                )
                RETURNING id
              `;
              if (novoMat.length > 0) {
                await rawSql`
                  INSERT INTO movimentacoes_estoque (material_id, tipo, item_tipo, quantidade, motivo, usuario_id, tenant_id)
                  VALUES (${novoMat[0].id}, 'entrada', 'material', ${r.quantidade}, 'GERAÇÃO AUTOMÁTICA DE SOBRA DE CORTE', ${user?.id || null}, ${tenantId})
                `;
              }
            }
          }

          // 3. Criar Ordem de Produção (Problem 5)
          const op_id = `OP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

          await rawSql`
            INSERT INTO ordens_producao (id, op_id, produto, status, projeto_id, quotation_id, visita_id, created_at, updated_at, tenant_id)
            VALUES (
              gen_random_uuid(), 
              ${op_id}, 
              ${req.body.nome_projeto || 'PLANO DE CORTE'}, 
              'AGUARDANDO', 
              ${safeUuid(req.body.projeto_id)}, 
              ${safeUuid(req.body.quotation_id)}, 
              ${safeUuid(req.body.visita_id)},
              NOW(),
              NOW(),
              ${tenantId}
            )
          `;

          return res.status(200).json({
            success: true,
            message: 'PRODUÇÃO APROVADA! ORDEM DE PRODUÇÃO GERADA E ESTOQUE ATUALIZADO.',
            data: { op_id },
          });
        } else {
          const { plano_id, materiais, resultado } = req.body;
          const validPlanoId = safeUuid(plano_id);
          if (!validPlanoId)
            return res.status(400).json({ success: false, error: 'ID do plano inválido' });

          const [before] = await db
            .select()
            .from(planosDeCorte)
            .where(and(eq(planosDeCorte.id, validPlanoId), eq(planosDeCorte.tenantId, tenantId)));

          const [atualizado] = await db
            .update(planosDeCorte)
            .set({
              materiais,
              resultado,
              updated_at: new Date(),
            })
            .where(and(eq(planosDeCorte.id, validPlanoId), eq(planosDeCorte.tenantId, tenantId)))
            .returning();

          await auditLog(
            'planos_de_corte',
            validPlanoId,
            'SAVE_RESULT',
            user?.id,
            before,
            atualizado,
          );

          return res.status(200).json({ success: true, data: atualizado });
        }
      }

      case 'PUT': {
        const validId = safeUuid(id);
        if (!validId) return res.status(400).json({ success: false, error: 'ID inválido' });

        const [upd] = await db
          .update(planosDeCorte)
          .set({ ...req.body, updated_at: new Date() })
          .where(and(eq(planosDeCorte.id, validId), eq(planosDeCorte.tenantId, tenantId)))
          .returning();
        return res.status(200).json({ success: true, data: upd });
      }

      case 'DELETE': {
        const validId = safeUuid(id);
        if (!validId) return res.status(400).json({ success: false, error: 'ID inválido' });

        const [existing] = await db
          .select()
          .from(planosDeCorte)
          .where(and(eq(planosDeCorte.id, validId), eq(planosDeCorte.tenantId, tenantId)));
        if (!existing)
          return res.status(404).json({ success: false, error: 'PLANO NÃO ENCONTRADO' });

        await db
          .update(planosDeCorte)
          .set({ deleted_at: new Date() })
          .where(and(eq(planosDeCorte.id, validId), eq(planosDeCorte.tenantId, tenantId)));

        await auditLog('planos_de_corte', validId, 'DELETE', user?.id, existing, {
          status: 'deleted',
        });

        return res.status(200).json({ success: true });
      }

      default:
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }
  } catch (err: any) {
    logger.error('PLANO_CORTE_API_ERROR:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// --- 2. Handler de Chapas (Estoque) ---
const handleChapasCore: TenantHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const user = req.tenantUser;

  const { q } = req.query || {};
  try {
    const termText = String(q || '').trim();

    // 1. Buscar no Estoque (Tabela materiais)
    let queryMats;
    if (termText) {
      const term = `%${termText}%`;
      queryMats = await rawSql`
        SELECT m.id, m.sku, m.nome, m.largura_mm, m.altura_mm, m.preco_custo
        FROM materiais m
        LEFT JOIN erp_categories c ON m.categoria_id = c.id
        WHERE m.ativo = true AND m.tenant_id = ${tenantId}
          AND (m.sku ILIKE 'CHP-%' OR m.categoria_id = 'CHP' OR c.nome ILIKE '%chapa%')
          AND (m.sku ILIKE ${term} OR m.nome ILIKE ${term})
      `;
    } else {
      queryMats = await rawSql`
        SELECT m.id, m.sku, m.nome, m.largura_mm, m.altura_mm, m.preco_custo
        FROM materiais m
        LEFT JOIN erp_categories c ON m.categoria_id = c.id
        WHERE m.ativo = true AND m.tenant_id = ${tenantId}
          AND (m.sku ILIKE 'CHP-%' OR m.categoria_id = 'CHP' OR c.nome ILIKE '%chapa%')
      `;
    }

    const matsMapped = queryMats.map((m: any) => {
      const nome = m.nome || '';
      const espessuraMatch = nome.match(/(\d+)\s*MM/i);
      const espessura_mm = espessuraMatch ? parseInt(espessuraMatch[1], 10) : 15;

      return {
        id: m.id,
        sku: m.sku,
        nome: m.nome,
        largura_mm: Number(m.largura_mm || 2750),
        altura_mm: Number(m.altura_mm || 1830),
        espessura_mm: espessura_mm,
        preco_unitario: String(m.preco_custo || '0.00'),
        estoque: 0,
        estoque_minimo: 5,
        ativo: true,
      };
    });

    // 2. Buscar nas Chapas Industriais (Tabela erp_chapas)
    let queryErp;
    if (termText) {
      const term = `%${termText}%`;
      queryErp = await db
        .select()
        .from(erpChapas)
        .where(
          and(
            eq(erpChapas.tenantId, tenantId),
            or(
              ilike(erpChapas.sku, term),
              ilike(erpChapas.nome, term),
              sql`LOWER(${erpChapas.nome}) LIKE LOWER(${term})`,
              sql`LOWER(${erpChapas.sku}) = LOWER(${termText})`,
            ),
          ),
        );
    } else {
      queryErp = await db.select().from(erpChapas).where(eq(erpChapas.tenantId, tenantId));
    }

    const erpMapped = queryErp.map((e: any) => ({
      id: e.id,
      sku: e.sku,
      nome: e.nome,
      largura_mm: Number(e.largura_mm),
      altura_mm: Number(e.altura_mm),
      espessura_mm: Number(e.espessura_mm),
      preco_unitario: String(e.preco_unitario || '0.00'),
      estoque: Number(e.estoque || 0),
      estoque_minimo: Number(e.estoque_minimo || 5),
      ativo: e.ativo,
    }));

    // 3. Mesclar resultados eliminando SKUs duplicados (priorizando materiais de estoque)
    const combined = [...matsMapped];
    const skusEstoque = new Set(matsMapped.map((m) => m.sku.toUpperCase()));

    for (const e of erpMapped) {
      if (!skusEstoque.has(e.sku.toUpperCase())) {
        combined.push(e);
      }
    }

    return res.status(200).json({ success: true, data: combined });
  } catch (err: any) {
    logger.error('ERRO_BUSCA_CHAPAS:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// --- 3. Handler de Engenharia (Integrado com Orçamentos Pro) ---
const handleEngenhariaSKUsCore: TenantHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const user = req.tenantUser;

  const { q } = req.query || {};
  try {
    const termText = String(q || '').trim();
    if (termText) {
      const term = `%${termText}%`;
      const results = await db
        .select()
        .from(skuEngenharia)
        .where(
          and(
            eq(skuEngenharia.tenantId, tenantId),
            or(ilike(skuEngenharia.codigo, term), ilike(skuEngenharia.nome, term)),
          ),
        );
      return res.status(200).json({ success: true, data: results });
    }
    const all = await db
      .select()
      .from(skuEngenharia)
      .where(eq(skuEngenharia.tenantId, tenantId))
      .limit(50);
    return res.status(200).json({ success: true, data: all });
  } catch (err: any) {
    logger.error('ERRO_ENGENHARIA_SKUS:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * IMPORTAÇÃO DE DESENHO TÉCNICO (FASE 1 - EXTRAÇÃO DE TEXTO)
 */
const handleImportarDesenhoCore: TenantHandler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { fileBase64 } = req.body;
    if (!fileBase64)
      return res.status(400).json({ success: false, error: 'ARQUIVO NÃO FORNECIDO' });

    // Decodificar Base64
    const { fileName } = req.body;
    const buffer = Buffer.from(fileBase64, 'base64');
    let text = '';

    // Detectar se é DXF (pela extensão ou cabeçalho '0')
    const isDXF =
      fileName?.toLowerCase().endsWith('.dxf') ||
      (buffer.length > 4 && buffer.toString('utf8', 0, 1).trim() === '0');

    if (isDXF) {
      // Parse otimizado de DXF (Fase 5)
      const rawText = buffer.toString('utf-8');
      const dxfLines = rawText.split(/\r?\n/);
      let extractedFromDXF = '';

      // Limite de 500k linhas para evitar travamento em arquivos gigantescos
      const maxLines = Math.min(dxfLines.length, 500000);

      for (let i = 0; i < maxLines; i++) {
        const line = dxfLines[i].trim();
        // Group Codes: 1 (Texto), 3 (Texto Adicional), 100 (Subclasse)
        if (line === '1' || line === '3') {
          const val = (dxfLines[i + 1] || '').trim();
          if (val && val.length > 1 && !val.startsWith('$')) {
            extractedFromDXF += val + '\n';
          }
        }
      }
      text = extractedFromDXF;
    } else {
      // Extrair texto do PDF (Fases 1-4) com PDF.js Engine (Mais estável em Serverless)
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(buffer),
          useSystemFonts: true,
          disableFontFace: true,
        });

        const pdfDoc = await loadingTask.promise;
        let fullText = '';

        // Limitar processamento a 20 páginas para evitar timeout em arquivos gigantes
        const pagesToProcess = Math.min(pdfDoc.numPages, 20);

        for (let i = 1; i <= pagesToProcess; i++) {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => ('str' in item ? item.str : ''))
            .filter((s) => s.trim().length > 0)
            .join(' ');
          fullText += pageText + '\n';
        }
        text = fullText;

        if (!text.trim()) throw new Error('PDF sem conteúdo de texto extraível');
      } catch (pdfErr: any) {
        logger.error('[API] Falha crítica na extração de PDF:', pdfErr);
        return res.status(500).json({
          success: false,
          error:
            'ESTE PDF NÃO CONTÉM DADOS DE TEXTO EXTRAÍVEIS. TENTE USAR O ARQUIVO DXF ORIGINAL.',
          details: pdfErr.message,
        });
      }
    }

    const pecas: any[] = [];
    const lines = text.split('\n');

    // Lista expandida de materiais e acabamentos industriais (Fase 2.1)
    const materialKeywords = [
      'MDF',
      'MDP',
      'COMPENSADO',
      'OSB',
      'HDF',
      'BRANCO',
      'GRAFITE',
      'CARVALHO',
      'FREIJO',
      'LOUREIRO',
      'PRETO',
      'CINZA',
      'CANELA',
      'AMARULA',
      'GELATO',
      'NOVAES',
      'GIANDUIA',
      'TITANIO',
      'CHUMBO',
      'CAPRI',
      'EBANO',
      'MARFIM',
      'CEDRO',
      'IMBUIA',
      'WENGUE',
      'NOCE',
      'LARICE',
      'CALCATA',
    ];

    /**
     * Regex para identificar padrões de peças e dimensões (LxAxE)
     * Suporta: "Peça: 800x600x18", "Base 800 * 600 * 18", "Lateral 800 x 600 x 18"
     */
    const regexDimensoes =
      /(?:([a-zA-ZÀ-ÿ0-9\s\-_]{2,})[:\-\s]+)?(\d+(?:[.,]\d+)?)\s*(?:mm|cm)?\s*[xX*]\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm)?\s*[xX*]\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm)?/;

    /**
     * Regex para Tabelas (Fase 3):
     * Suporta linhas de softwares como CorteCloud, Promob, SketchUp
     */
    const regexTabela =
      /(?:(\d+)\s+)?([a-zA-ZÀ-ÿ0-9\s\-_]{3,})\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)(?:\s+(\d+))?/;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.length < 5) continue;

      // Limpeza de ruído de PDF (caracteres de controle)
      // eslint-disable-next-line no-control-regex
      const cleanLine = trimmedLine.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

      // 1. Tenta Padrão de Dimensões Explícitas
      let match = cleanLine.match(regexDimensoes);

      // 2. Se não achou, tenta Padrão de Tabela
      if (!match) {
        match = cleanLine.match(regexTabela);
        if (match) {
          const nome = match[2]?.trim();
          const largura = match[3];
          const comprimento = match[4];
          const espessura = match[5];
          const quantidade = match[6] || '1';

          pecas.push({
            id: `p-${Math.random().toString(36).substring(2, 7)}`,
            nome: nome || `Item ${match[1] || pecas.length + 1}`,
            largura: parseFloat(largura.replace(',', '.')),
            comprimento: parseFloat(comprimento.replace(',', '.')),
            espessura: parseFloat(espessura.replace(',', '.')),
            quantidade: parseInt(quantidade),
            material: '',
          });

          const lastPeca = pecas[pecas.length - 1];
          const upperLine = cleanLine.toUpperCase();
          for (const kw of materialKeywords) {
            if (upperLine.includes(kw)) {
              lastPeca.material = kw;
              break;
            }
          }
          continue;
        }
      }

      // 3. Processamento Final (Match de Dimensões)
      if (match) {
        const nomeFinal = match[1]?.trim() || `Peça ${pecas.length + 1}`;

        // Detecção inteligente de material
        const upperLine = cleanLine.toUpperCase();
        let materialDetectado = '';
        for (const kw of materialKeywords) {
          if (upperLine.includes(kw)) {
            // Pega a palavra do material e possivelmente o próximo termo (ex: MDF BRANCO)
            const parts = upperLine.split(/\s+/);
            const idx = parts.findIndex((p) => p.includes(kw));
            materialDetectado = parts
              .slice(idx, idx + 2)
              .join(' ')
              .replace(/[:\d\-*xX]/g, '')
              .trim();
            break;
          }
        }

        pecas.push({
          id: `p-${Math.random().toString(36).substring(2, 7)}`,
          nome: nomeFinal,
          largura: parseFloat(match[2].replace(',', '.')),
          comprimento: parseFloat(match[3].replace(',', '.')),
          espessura: parseFloat(match[4].replace(',', '.')),
          quantidade: 1,
          material: materialDetectado || '',
        });
      }
    }

    // Filtragem e Normalização (Fase 5)
    // - Remove peças com dimensões irreais
    // - Ordena para que Largura seja sempre a maior dimensão (orientação de fibra padrão)
    const pecasValidas = pecas
      .filter((p) => p.largura > 5 && p.comprimento > 5 && p.espessura > 0)
      .map((p) => {
        if (p.comprimento > p.largura) {
          return { ...p, largura: p.comprimento, comprimento: p.largura };
        }
        return p;
      });

    return res.status(200).json({
      success: true,
      data: pecasValidas,
      count: pecasValidas.length,
      debug: { textLength: text.length, rawCount: pecas.length },
    });
  } catch (err: any) {
    logger.error('IMPORT_DESENHO_ERROR:', err);
    return res.status(500).json({ success: false, error: 'ERRO AO PROCESSAR PDF: ' + err.message });
  }
};

export const handlePlanoCorte = withTenant(handlePlanoCorteCore);
export const handleChapas = withTenant(handleChapasCore);
export const handleEngenhariaSKUs = withTenant(handleEngenhariaSKUsCore);
export const handleImportarDesenho = withTenant(handleImportarDesenhoCore);
