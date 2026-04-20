import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../../lib/db';
import { condicoesPagamento } from '../../../../db/schema/financeiro';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const p = req.body;

    if (p.condicao_pagamento_id && p.valor_original) {
      const [cond] = await db.select().from(condicoesPagamento).where(eq(condicoesPagamento.id, p.condicao_pagamento_id)).limit(1);
      if (!cond) return res.status(400).json({ error: 'Condição de pagamento não encontrada' });

      const parcelas = Number(cond.parcelas || 1);
      const entradaPct = Number(cond.entrada_percentual || 0) / 100;
      const valorTotal = Number(p.valor_original || 0);

      const valorEntrada = Number((valorTotal * entradaPct).toFixed(2));
      const restante = Number((valorTotal - valorEntrada).toFixed(2));
      const valorParcelaBase = Number((restante / (parcelas || 1)).toFixed(2));

      const dataEmissao = p.data_emissao ? new Date(p.data_emissao) : new Date();
      const primeiraVenc = p.data_vencimento ? new Date(p.data_vencimento) : new Date(dataEmissao);

      const parcelasPreview: any[] = [];
      for (let i = 0; i < parcelas; i++) {
        const parcelaNum = i + 1;
        const venc = new Date(primeiraVenc.getTime());
        venc.setDate(primeiraVenc.getDate() + i * 30);
        let valorParcela = valorParcelaBase;
        if (i === parcelas - 1) {
          const soma = valorEntrada + valorParcelaBase * parcelas;
          const diff = Number((valorTotal - soma).toFixed(2));
          valorParcela = Number((valorParcelaBase + diff).toFixed(2));
        }
        parcelasPreview.push({ parcela: parcelaNum, valor: parcelaNum === 1 && entradaPct > 0 ? valorEntrada : valorParcela, vencimento: venc.toISOString() });
      }

      return res.status(200).json({ parcelas: parcelasPreview });
    }

    return res.status(400).json({ error: 'Parâmetros inválidos' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
