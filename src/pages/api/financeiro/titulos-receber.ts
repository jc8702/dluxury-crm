import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../lib/db';
import { titulosReceber, baixas } from '../../../db/schema/financeiro';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const rows = await db.select().from(titulosReceber).orderBy(titulosReceber.data_vencimento);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const p = req.body;
      // TODO: gerar número sequencial de título
      const numero = p.numero_titulo || `TR-${Date.now()}`;
      const [inserted] = await db.insert(titulosReceber).values({
        numero_titulo: numero,
        cliente_id: p.cliente_id,
        projeto_id: p.projeto_id || null,
        orcamento_id: p.orcamento_id || null,
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
        forma_recebimento_id: p.forma_recebimento_id,
        status: p.status || 'aberto',
        parcela: p.parcela || 1,
        total_parcelas: p.total_parcelas || 1,
      }).returning();
      return res.status(201).json(inserted);
    }

    if (req.method === 'PUT') {
      const p = req.body;
      await db.update(titulosReceber).set({
        valor_liquido: p.valor_liquido,
        valor_desconto: p.valor_desconto,
        data_vencimento: p.data_vencimento,
        status: p.status,
      }).where(eq(titulosReceber.id, p.id));
      const updated = await db.select().from(titulosReceber).where(eq(titulosReceber.id, p.id)).limit(1);
      return res.status(200).json(updated[0]);
    }

    if (req.method === 'POST' && req.url?.endsWith('/baixar')) {
      // Not reachable here due to single route file; separate endpoint below
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
