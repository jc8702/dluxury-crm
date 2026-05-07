import { db } from './drizzle-db.js';
import { planosDeCorte, erpChapas, erpSkusEngenharia, retalhosEstoque, movimentacoesEstoque } from '../db/schema/planos-de-corte.js';
import { eq, ilike, or, isNull, and } from 'drizzle-orm';
import { auditLog, sql, validateAuth } from './_db.js';

/**
 * MÓDULO PLANO DE CORTE INDUSTRIAL - REESCRITA COM DRIZZLE
 */

// --- 1. Handler Principal (CRUD de Planos) ---
export async function handlePlanoCorte(req: any, res: any) {
  const method = req.method;
  const { id } = req.query || {};

  try {
    switch (method) {
      case 'GET':
        if (id) {
          const [plano] = await db.select().from(planosDeCorte).where(and(eq(planosDeCorte.id, id), isNull(planosDeCorte.deleted_at)));
          if (!plano) return res.status(404).json({ success: false, error: 'Plano não encontrado' });
          return res.status(200).json({ success: true, data: plano });
        } else {
          const planos = await db.select().from(planosDeCorte).where(isNull(planosDeCorte.deleted_at));
          return res.status(200).json({ success: true, data: planos });
        }

      case 'POST':
        // Criar ou Salvar Resultado
        const { action } = req.query || {};
        
        if (action === 'criar_plano') {
          const { user } = validateAuth(req);
          const [novo] = await db.insert(planosDeCorte).values({
            nome: req.body.nome,
            kerf_mm: req.body.kerf_mm || 3,
            materiais: req.body.materiais || [],
            sku_engenharia: req.body.sku_engenharia,
            visita_id: req.body.visita_id || null,
            projeto_id: req.body.projeto_id || null,
            orcamento_id: req.body.orcamento_id || null,
            ordem_producao_id: req.body.ordem_producao_id || null,
          }).returning();
          
          await auditLog('planos_de_corte', novo.id, 'CREATE', user?.id, null, novo);
          
          return res.status(201).json({ success: true, data: novo });
        } else if (action === 'aprovar_producao') {
          const { user } = validateAuth(req);
          const { materiais_consumidos, retalhos_gerados } = req.body;
          
          // 1. Processar Materiais Consumidos
          for (const item of materiais_consumidos) {
            if (item.id_retalho) {
              // Uso de Retalho Existente
              await db.update(retalhosEstoque)
                .set({ 
                  disponivel: false, 
                  utilizado_em_id: item.plano_id, 
                  data_utilizacao: new Date(),
                  updated_at: new Date()
                })
                .where(eq(retalhosEstoque.id, item.id_retalho));

              await db.insert(movimentacoesEstoque).values({
                tipo: 'uso_plano',
                item_tipo: 'retalho',
                retalho_id: item.id_retalho,
                plano_corte_id: item.plano_id,
                quantidade: 1,
                motivo: 'Consumo em produção',
                usuario_id: user?.id
              });
            } else {
              // Uso de Chapa Inteira
              await db.execute(sql`
                UPDATE erp_chapas 
                SET estoque = COALESCE(estoque, 0) - ${item.qtd || 1} 
                WHERE sku = ${item.sku}
              `);

              await db.insert(movimentacoesEstoque).values({
                tipo: 'uso_plano',
                item_tipo: 'chapa',
                chapa_id: item.chapa_id, // Idealmente passar o ID
                plano_corte_id: item.plano_id,
                quantidade: item.qtd || 1,
                motivo: `Consumo SKU: ${item.sku}`,
                usuario_id: user?.id
              });
            }
          }

          // 2. Gerar Novos Retalhos (Sobras Reutilizáveis)
          if (retalhos_gerados && Array.isArray(retalhos_gerados)) {
            for (const r of retalhos_gerados) {
              const [novoRetalho] = await db.insert(retalhosEstoque).values({
                largura_mm: r.largura_mm,
                altura_mm: r.altura_mm,
                espessura_mm: r.espessura_mm,
                sku_chapa: r.sku_chapa,
                origem: 'sobra_plano_corte',
                plano_corte_origem_id: r.plano_corte_id,
                usuario_criou: user?.id || 'sistema',
                disponivel: true,
                descartado: false,
                metadata: { automatico: true }
              }).returning();

              await db.insert(movimentacoesEstoque).values({
                tipo: 'entrada',
                item_tipo: 'retalho',
                retalho_id: novoRetalho.id,
                plano_corte_id: r.plano_corte_id,
                quantidade: 1,
                motivo: 'Geração automática de sobra',
                usuario_id: user?.id
              });
            }
          }

          // 3. Criar Ordem de Produção (Problem 5)
          const op_id = `OP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          
          await sql`
            INSERT INTO ordens_producao (id, op_id, produto, status, projeto_id, orcamento_id, visita_id, created_at, updated_at)
            VALUES (
              gen_random_uuid(), 
              ${op_id}, 
              ${req.body.nome_projeto || 'PLANO DE CORTE'}, 
              'AGUARDANDO', 
              ${req.body.projeto_id || null}, 
              ${req.body.orcamento_id || null}, 
              ${req.body.visita_id || null},
              NOW(),
              NOW()
            )
          `;

          return res.status(200).json({ 
            success: true, 
            message: 'Produção aprovada! Ordem de Produção gerada e estoque atualizado.',
            data: { op_id }
          });
        } else {
          const { user } = validateAuth(req);
          const { plano_id, materiais, resultado, KPIs } = req.body;
          const [before] = await db.select().from(planosDeCorte).where(eq(planosDeCorte.id, plano_id));
          
          const [atualizado] = await db.update(planosDeCorte)
            .set({ 
              materiais, 
              resultado, 
              updated_at: new Date() 
            })
            .where(eq(planosDeCorte.id, plano_id))
            .returning();

          await auditLog('planos_de_corte', plano_id, 'SAVE_RESULT', user?.id, before, atualizado);
          
          return res.status(200).json({ success: true, data: atualizado });
        }

      case 'PUT':
        const [upd] = await db.update(planosDeCorte)
          .set({ ...req.body, updated_at: new Date() })
          .where(eq(planosDeCorte.id, id))
          .returning();
        return res.status(200).json({ success: true, data: upd });

      case 'DELETE':
        const { user } = validateAuth(req);
        const [existing] = await db.select().from(planosDeCorte).where(eq(planosDeCorte.id, id));
        if (!existing) return res.status(404).json({ success: false, error: 'Plano não encontrado' });

        await db.update(planosDeCorte).set({ deleted_at: new Date() }).where(eq(planosDeCorte.id, id));
        
        await auditLog('planos_de_corte', id, 'DELETE', user?.id, existing, { status: 'deleted' });
        
        return res.status(200).json({ success: true });

      default:
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }
  } catch (err: any) {
    console.error('PLANO_CORTE_API_ERROR:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// --- 2. Handler de Chapas (Estoque) ---
export async function handleChapas(req: any, res: any) {
  const { q } = req.query || {};
  try {
    const termText = String(q || '').trim();
    if (termText) {
      const term = `%${termText}%`;
      const results = await db.select()
        .from(erpChapas)
        .where(or(
          ilike(erpChapas.sku, term), 
          ilike(erpChapas.nome, term),
          // Busca por descrição parcial (caso o termo seja parte de 'MDF Branco')
          sql`LOWER(${erpChapas.nome}) LIKE LOWER(${term})`,
          sql`LOWER(${erpChapas.sku}) = LOWER(${termText})` // SKU Exato
        ));
      return res.status(200).json({ success: true, data: results });
    }
    const all = await db.select().from(erpChapas);
    return res.status(200).json({ success: true, data: all });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// --- 3. Handler de Engenharia ---
export async function handleEngenhariaSKUs(req: any, res: any) {
  const { q } = req.query || {};
  try {
    const termText = String(q || '').trim();
    if (termText) {
      const term = `%${termText}%`;
      const results = await db.select()
        .from(erpSkusEngenharia)
        .where(or(ilike(erpSkusEngenharia.sku, term), ilike(erpSkusEngenharia.nome, term)));
      return res.status(200).json({ success: true, data: results });
    }
    const all = await db.select().from(erpSkusEngenharia).limit(20);
    return res.status(200).json({ success: true, data: all });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
