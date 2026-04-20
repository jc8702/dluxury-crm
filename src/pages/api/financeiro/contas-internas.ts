import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../lib/db';
import { contasInternas } from '../../../db/schema/financeiro';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const rows = await db.select().from(contasInternas).orderBy(contasInternas.nome);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const payload = req.body;
      const [inserted] = await db.insert(contasInternas).values({
        nome: payload.nome,
        tipo: payload.tipo,
        banco_codigo: payload.banco_codigo,
        agencia: payload.agencia,
        conta: payload.conta,
        saldo_inicial: payload.saldo_inicial || 0,
        saldo_atual: payload.saldo_inicial || 0,
        data_saldo_inicial: payload.data_saldo_inicial || null,
      }).returning();
      return res.status(201).json(inserted);
    }

    if (req.method === 'PUT') {
      const payload = req.body;
      await db.update(contasInternas).set({
        nome: payload.nome,
        tipo: payload.tipo,
        banco_codigo: payload.banco_codigo,
        agencia: payload.agencia,
        conta: payload.conta,
        ativa: payload.ativa,
      }).where(eq(contasInternas.id, payload.id));
      const updated = await db.select().from(contasInternas).where(eq(contasInternas.id, payload.id)).limit(1);
      return res.status(200).json(updated[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
