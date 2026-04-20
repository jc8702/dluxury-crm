import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../../lib/db';
import { movimentacoesTesouraria, baixas } from '../../../../db/schema/financeiro';
import { eq, or } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id param' });

    // Movimentações que envolvem a conta (origem ou destino)
    const movs = await db.select().from(movimentacoesTesouraria).where(or(eq(movimentacoesTesouraria.conta_origem_id, String(id)), eq(movimentacoesTesouraria.conta_destino_id, String(id)))).orderBy(movimentacoesTesouraria.data_movimento.desc());

    // Baixas que utilizaram a conta
    const baixasList = await db.select().from(baixas).where(eq(baixas.conta_interna_id, String(id))).orderBy(baixas.data_baixa.desc());

    return res.status(200).json({ movimentacoes: movs, baixas: baixasList });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
