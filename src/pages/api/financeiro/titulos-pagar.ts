import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../lib/db';
import { titulosPagar } from '../../../db/schema/financeiro';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const rows = await db.select().from(titulosPagar).orderBy(titulosPagar.data_vencimento);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const p = req.body;
      const numero = p.numero_titulo || `TP-${Date.now()}`;
      const [inserted] = await db.insert(titulosPagar).values({
        numero_titulo: numero,
        fornecedor_id: p.fornecedor_id,
        nota_fiscal: p.nota_fiscal || null,
        pedido_compra_id: p.pedido_compra_id || null,
        valor_original: p.valor_original,
        valor_liquido: p.valor_liquido,
        valor_juros: p.valor_juros || 0,
        valor_multa: p.valor_multa || 0,
        valor_desconto: p.valor_desconto || 0,
        valor_aberto: p.valor_aberto,
        data_emissao: p.data_emissao,
        data_vencimento: p.data_vencimento,
        data_competencia: p.data_competencia,
        classe_financeira_id: p.classe_financeira_id,
        forma_pagamento_id: p.forma_pagamento_id,
        conta_bancaria_id: p.conta_bancaria_id,
        status: p.status || 'aberto',
        parcela: p.parcela || 1,
        total_parcelas: p.total_parcelas || 1,
      }).returning();
      return res.status(201).json(inserted);
    }

    if (req.method === 'PUT') {
      const p = req.body;
      await db.update(titulosPagar).set({
        valor_liquido: p.valor_liquido,
        data_vencimento: p.data_vencimento,
        status: p.status,
      }).where(eq(titulosPagar.id, p.id));
      const updated = await db.select().from(titulosPagar).where(eq(titulosPagar.id, p.id)).limit(1);
      return res.status(200).json(updated[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
