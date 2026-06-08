import { db } from './drizzle-db.js';
import { retalhosEstoque } from '../db/schema/planos-de-corte.js';
import { eq, and, gte } from 'drizzle-orm';
import { validateAuth } from './_db.js';
import { logger } from './logger.js';

/**
 * HANDLER PARA GESTÃO DE RETALHOS (BLOCO 2)
 */
export async function handleRetalhos(req: any, res: any) {
  const { authorized, error, user } = validateAuth(req);
  if (!authorized) return res.status(401).json({ success: false, error });
  const tenantId = req.tenantId; // injetado por tenantMiddleware

  const method = req.method;
  const { id, action } = req.query || {};

  try {
    switch (method) {
      case 'GET':
        if (id) {
          const [item] = await db
            .select()
            .from(retalhosEstoque)
            .where(and(eq(retalhosEstoque.id, id), eq(retalhosEstoque.tenantId, tenantId)));
          if (!item)
            return res.status(404).json({ success: false, error: 'Retalho não encontrado' });
          return res.status(200).json({ success: true, data: item });
        } else {
          // Listagem com filtros
          const { sku_chapa, largura_min, altura_min, disponivel, descartado } = req.query || {};

          const query = db.select().from(retalhosEstoque);
          const filters = [eq(retalhosEstoque.tenantId, tenantId)];

          if (sku_chapa) filters.push(eq(retalhosEstoque.sku_chapa, sku_chapa));
          if (largura_min) filters.push(gte(retalhosEstoque.largura_mm, parseInt(largura_min)));
          if (altura_min) filters.push(gte(retalhosEstoque.altura_mm, parseInt(altura_min)));
          if (disponivel !== undefined)
            filters.push(eq(retalhosEstoque.disponivel, disponivel === 'true'));
          if (descartado !== undefined)
            filters.push(eq(retalhosEstoque.descartado, descartado === 'true'));

          const results = await query.where(and(...filters)).orderBy(retalhosEstoque.created_at);
          return res.status(200).json({ success: true, data: results });
        }

      case 'POST':
        // Criar novo retalho usando SQL direto para evitar erros de mapeamento do Drizzle
        try {
          const {
            largura_mm,
            altura_mm,
            espessura_mm,
            sku_chapa,
            origem,
            plano_corte_origem_id,
            projeto_origem,
            observacoes,
            localizacao,
            disponivel,
            descartado,
            metadata,
          } = req.body;

          const usuario_criou = user?.name || req.body.usuario_criou || 'SISTEMA';
          const now = new Date().toISOString();

          const { sql: rawSql } = await import('./_db.js');

          // Gerar SKU no padrão RET-XXXX
          const skuResult = await (rawSql as any)`
            SELECT COALESCE(MAX(CAST(SUBSTRING(sku, 5) AS INTEGER)), 0) + 1 AS prox
            FROM retalhos_estoque
            WHERE sku ~ '^RET-[0-9]+$' AND tenant_id = ${tenantId}
          `;
          const prox = Array.isArray(skuResult) ? skuResult[0]?.prox || 1 : 1;
          const sku = `RET-${String(prox).padStart(4, '0')}`;

          const result = await (rawSql as any)`
            INSERT INTO retalhos_estoque (
              sku, largura_mm, altura_mm, espessura_mm, sku_chapa, origem, 
              plano_corte_origem_id, projeto_origem, observacoes, 
              localizacao, disponivel, descartado, usuario_criou, 
              created_at, updated_at, metadata, tenant_id
            ) VALUES (
              ${sku}, ${largura_mm}, ${altura_mm}, ${espessura_mm}, ${sku_chapa}, ${origem}, 
              ${plano_corte_origem_id || null}, ${projeto_origem || null}, ${observacoes || null}, 
              ${localizacao || 'GERAL'}, ${disponivel ?? true}, ${descartado ?? false}, ${usuario_criou}, 
              ${now}, ${now}, ${JSON.stringify(metadata || {})}, ${tenantId}
            ) RETURNING *
          `;

          const novo = Array.isArray(result) ? result[0] : result;
          return res.status(201).json({ success: true, data: novo });
        } catch (dbErr: any) {
          logger.error('DATABASE_INSERT_ERROR:', dbErr);
          throw dbErr;
        }

      case 'PATCH': {
        // Atualizar retalho (usar ou descartar)
        if (!id) return res.status(400).json({ success: false, error: 'ID necessário' });

        const updateData: any = {
          ...req.body,
          updated_at: new Date(),
          usuario_atualizou: user?.name || 'SISTEMA',
        };

        if (action === 'usar') {
          updateData.disponivel = false;
          updateData.data_utilizacao = new Date();
        } else if (action === 'descartar') {
          updateData.descartado = true;
          updateData.disponivel = false;
          updateData.data_descarte = new Date();
        }

        const [atualizado] = await db
          .update(retalhosEstoque)
          .set(updateData)
          .where(and(eq(retalhosEstoque.id, id), eq(retalhosEstoque.tenantId, tenantId)))
          .returning();

        return res.status(200).json({ success: true, data: atualizado });
      }

      case 'DELETE': {
        if (!id) return res.status(400).json({ success: false, error: 'ID necessário' });

        const [retalho] = await db
          .select({ sku: retalhosEstoque.sku })
          .from(retalhosEstoque)
          .where(and(eq(retalhosEstoque.id, id), eq(retalhosEstoque.tenantId, tenantId)));

        if (retalho && retalho.sku) {
          const { sql: rawSql } = await import('./_db.js');

          // Encontrar material vinculado
          const matRes =
            await (rawSql as any)`SELECT id FROM materiais WHERE sku = ${retalho.sku} AND tenant_id = ${tenantId}`;
          if (Array.isArray(matRes) && matRes.length > 0) {
            const matId = matRes[0].id;
            // Remover movimentações vinculadas ao material
            await (rawSql as any)`DELETE FROM movimentacoes_estoque WHERE material_id = ${matId} AND tenant_id = ${tenantId}`;
            // Remover da tabela materiais
            await (rawSql as any)`DELETE FROM materiais WHERE id = ${matId} AND tenant_id = ${tenantId}`;
          }

          // Remover também movimentações vinculadas ao ID do retalho
          await (rawSql as any)`DELETE FROM movimentacoes_estoque WHERE retalho_id = ${id} AND tenant_id = ${tenantId}`;
        }

        await db
          .delete(retalhosEstoque)
          .where(and(eq(retalhosEstoque.id, id), eq(retalhosEstoque.tenantId, tenantId)));
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }
  } catch (err: any) {
    logger.error('RETALHOS_API_ERROR:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
