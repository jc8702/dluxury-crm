import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../lib/db';
import { formasPagamento } from '../../../db/schema/financeiro';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const rows = await db.select().from(formasPagamento).orderBy(formasPagamento.nome);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const p = req.body;
      const [inserted] = await db.insert(formasPagamento).values({ nome: p.nome, tipo: p.tipo, taxa_percentual: p.taxa_percentual || 0, prazo_compensacao_dias: p.prazo_compensacao_dias || 0 }).returning();
      return res.status(201).json(inserted);
    }

    if (req.method === 'PUT') {
      const p = req.body;
      await db.update(formasPagamento).set({ nome: p.nome, taxa_percentual: p.taxa_percentual, prazo_compensacao_dias: p.prazo_compensacao_dias, ativa: p.ativa }).where(eq(formasPagamento.id, p.id));
      const updated = await db.select().from(formasPagamento).where(eq(formasPagamento.id, p.id)).limit(1);
      return res.status(200).json(updated[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
