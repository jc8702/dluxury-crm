import { db } from './drizzle-db.js';
import { retalhosEstoque } from '../db/schema/planos-de-corte.js';
import { eq, and, gte, sql } from 'drizzle-orm';

/**
 * HANDLER PARA GESTÃO DE RETALHOS (BLOCO 2)
 */
export async function handleRetalhos(req: any, res: any) {
  const method = req.method;
  const { id, action } = req.query || {};

  try {
    switch (method) {
      case 'GET':
        if (id) {
          const [item] = await db.select().from(retalhosEstoque).where(eq(retalhosEstoque.id, id));
          if (!item) return res.status(404).json({ success: false, error: 'Retalho não encontrado' });
          return res.status(200).json({ success: true, data: item });
        } else {
          // Listagem com filtros
          const { sku_chapa, largura_min, altura_min, disponivel, descartado } = req.query || {};
          
          let query = db.select().from(retalhosEstoque);
          const filters = [];

          if (sku_chapa) filters.push(eq(retalhosEstoque.sku_chapa, sku_chapa));
          if (largura_min) filters.push(gte(retalhosEstoque.largura_mm, parseInt(largura_min)));
          if (altura_min) filters.push(gte(retalhosEstoque.altura_mm, parseInt(altura_min)));
          if (disponivel !== undefined) filters.push(eq(retalhosEstoque.disponivel, disponivel === 'true'));
          if (descartado !== undefined) filters.push(eq(retalhosEstoque.descartado, descartado === 'true'));

          const results = await query.where(and(...filters)).orderBy(retalhosEstoque.criado_em);
          return res.status(200).json({ success: true, data: results });
        }

      case 'POST':
        // Criar novo retalho
        const [novo] = await db.insert(retalhosEstoque).values({
          ...req.body,
          criado_em: new Date(),
          atualizado_em: new Date(),
          usuario_criou: req.user?.nome || 'Sistema'
        }).returning();
        return res.status(201).json({ success: true, data: novo });

      case 'PATCH':
        // Atualizar retalho (usar ou descartar)
        if (!id) return res.status(400).json({ success: false, error: 'ID necessário' });

        const updateData: any = { 
          ...req.body, 
          atualizado_em: new Date(),
          usuario_atualizou: req.user?.nome || 'Sistema'
        };

        if (action === 'usar') {
          updateData.disponivel = false;
          updateData.data_utilizacao = new Date();
        } else if (action === 'descartar') {
          updateData.descartado = true;
          updateData.disponivel = false;
          updateData.data_descarte = new Date();
        }

        const [atualizado] = await db.update(retalhosEstoque)
          .set(updateData)
          .where(eq(retalhosEstoque.id, id))
          .returning();
        
        return res.status(200).json({ success: true, data: atualizado });

      case 'DELETE':
        if (!id) return res.status(400).json({ success: false, error: 'ID necessário' });
        await db.delete(retalhosEstoque).where(eq(retalhosEstoque.id, id));
        return res.status(200).json({ success: true });

      default:
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }
  } catch (err: any) {
    console.error('RETALHOS_API_ERROR:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
