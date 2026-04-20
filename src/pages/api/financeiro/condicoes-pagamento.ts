import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../lib/db';
import { condicoesPagamento } from '../../../db/schema/financeiro';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const rows = await db.select().from(condicoesPagamento).orderBy(condicoesPagamento.nome);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const p = req.body;
      const [inserted] = await db.insert(condicoesPagamento).values({ nome: p.nome, descricao: p.descricao || null, parcelas: p.parcelas || 1, entrada_percentual: p.entrada_percentual || 0, juros_percentual: p.juros_percentual || 0 }).returning();
      return res.status(201).json(inserted);
    }

    if (req.method === 'PUT') {
      const p = req.body;
      await db.update(condicoesPagamento).set({ nome: p.nome, descricao: p.descricao, parcelas: p.parcelas, entrada_percentual: p.entrada_percentual, juros_percentual: p.juros_percentual, ativo: p.ativo }).where(eq(condicoesPagamento.id, p.id));
      const updated = await db.select().from(condicoesPagamento).where(eq(condicoesPagamento.id, p.id)).limit(1);
      return res.status(200).json(updated[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
