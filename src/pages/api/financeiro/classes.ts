import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../lib/db';
import { classesFinanceiras } from '../../../db/schema/financeiro';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const rows = await db.select().from(classesFinanceiras).orderBy(classesFinanceiras.codigo);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const payload = req.body;
      const [inserted] = await db.insert(classesFinanceiras).values({
        codigo: payload.codigo,
        nome: payload.nome,
        tipo: payload.tipo,
        natureza: payload.natureza,
        pai_id: payload.pai_id || null,
        ativa: payload.ativa ?? true,
        permite_lancamento: payload.permite_lancamento ?? true,
      }).returning();
      return res.status(201).json(inserted);
    }

    if (req.method === 'PUT') {
      const payload = req.body;
      await db.update(classesFinanceiras).set({
        nome: payload.nome,
        ativa: payload.ativa,
        permite_lancamento: payload.permite_lancamento,
        pai_id: payload.pai_id || null,
      }).where(eq(classesFinanceiras.id, payload.id));
      const updated = await db.select().from(classesFinanceiras).where(eq(classesFinanceiras.id, payload.id)).limit(1);
      return res.status(200).json(updated[0]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      // TODO: validar se existem títulos vinculados antes de excluir
      await db.delete(classesFinanceiras).where(eq(classesFinanceiras.id, String(id)));
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
