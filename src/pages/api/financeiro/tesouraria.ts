import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../lib/db';
import { movimentacoesTesouraria, contasInternas } from '../../db/schema/financeiro';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const rows = await db.select().from(movimentacoesTesouraria).orderBy(movimentacoesTesouraria.data_movimento.desc());
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const p = req.body;
      // Movimento avulso
      const [inserted] = await db.insert(movimentacoesTesouraria).values({
        tipo: p.tipo,
        conta_origem_id: p.conta_origem_id || null,
        conta_destino_id: p.conta_destino_id || null,
        valor: p.valor,
        data_movimento: p.data_movimento || new Date().toISOString(),
        classe_financeira_id: p.classe_financeira_id || null,
        descricao: p.descricao || '',
        comprovante_url: p.comprovante_url || null,
      }).returning();

      // Atualizar saldos em transferências
      if (p.tipo === 'transferencia' && p.conta_origem_id && p.conta_destino_id) {
        await db.transaction(async (tx) => {
          const [origem] = await tx.select().from(contasInternas).where(eq(contasInternas.id, p.conta_origem_id)).limit(1);
          const [destino] = await tx.select().from(contasInternas).where(eq(contasInternas.id, p.conta_destino_id)).limit(1);
          if (!origem || !destino) throw new Error('Conta origem ou destino não encontrada');
          await tx.update(contasInternas).set({ saldo_atual: Number(origem.saldo_atual) - Number(p.valor) }).where(eq(contasInternas.id, p.conta_origem_id));
          await tx.update(contasInternas).set({ saldo_atual: Number(destino.saldo_atual) + Number(p.valor) }).where(eq(contasInternas.id, p.conta_destino_id));
        });
      }

      return res.status(201).json(inserted);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
