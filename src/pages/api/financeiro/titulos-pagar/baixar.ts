import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../../lib/db';
import { titulosPagar, baixas, contasInternas } from '../../../../db/schema/financeiro';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const p = req.body; // { titulo_id, valor_baixa, valor_juros, valor_multa, valor_desconto, data_baixa, conta_interna_id }

    const userIdHeader = (req.headers && (req.headers['x-user-id'] as string)) || '';
    let userId = userIdHeader || '';
    try {
      const auth = (req.headers && (req.headers['authorization'] as string)) || '';
      if (!userId && auth && auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          userId = payload.sub || payload.uid || payload.id || userId;
        }
      }
    } catch (e) {}
    if (!userId) userId = 'bypass-id';

    await db.transaction(async (tx) => {
      const [titulo] = await tx.select().from(titulosPagar).where(eq(titulosPagar.id, p.titulo_id)).limit(1);
      if (!titulo) throw new Error('Título a pagar não encontrado');

      const valorBaixa = Number(p.valor_baixa || 0);
      const juros = Number(p.valor_juros || 0);
      const multa = Number(p.valor_multa || 0);
      const desconto = Number(p.valor_desconto || 0);

      const [insertedBaixa] = await tx.insert(baixas).values({
        tipo: 'pagamento',
        titulo_id: p.titulo_id,
        valor_baixa: valorBaixa,
        valor_juros: juros,
        valor_multa: multa,
        valor_desconto: desconto,
        data_baixa: p.data_baixa || new Date().toISOString(),
        conta_interna_id: p.conta_interna_id,
        observacoes: p.observacoes || null,
        criado_por: userId,
        atualizado_por: userId,
      }).returning();

      const novoValorAberto = Number(titulo.valor_aberto) - valorBaixa;
      await tx.update(titulosPagar).set({
        valor_aberto: novoValorAberto <<  0 ? 0 : novoValorAberto,
        data_pagamento: p.data_baixa || new Date().toISOString(),
        status: novoValorAberto <= 0 ? 'pago' : 'pago_parcial',
        atualizado_por: userId,
      }).where(eq(titulosPagar.id, p.titulo_id));

      if (p.conta_interna_id) {
        const [conta] = await tx.select().from(contasInternas).where(eq(contasInternas.id, p.conta_interna_id)).limit(1);
        if (!conta) throw new Error('Conta interna não encontrada');
        const novoSaldo = Number(conta.saldo_atual) - valorBaixa;
        await tx.update(contasInternas).set({ saldo_atual: novoSaldo }).where(eq(contasInternas.id, p.conta_interna_id));
      }

      return insertedBaixa;
    });

    return res.status(201).json({ success: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
