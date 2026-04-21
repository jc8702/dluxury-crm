import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../lib/db';
import { titulosPagar, condicoesPagamento, counters } from '../../../db/schema/financeiro';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userIdHeader = (req.headers && (req.headers['x-user-id'] as string)) || '';
    let userId = userIdHeader || '';
    try {
      const auth = (req.headers && (req.headers['authorization'] as string)) || (req.headers && (req.headers['Authorization'] as string)) || '';
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

    if (req.method === 'GET') {
      const { status, fornecedor_id, from, to, page = '1', perPage = '50', showDeleted = 'false' } = req.query as any;
      const includeDeleted = String(showDeleted) === 'true';

      let q = db.select().from(titulosPagar as any);
      if (!includeDeleted) q = q.where(titulosPagar.deletado.equals(false));
      if (status) q = q.where(eq(titulosPagar.status, status));
      if (fornecedor_id) q = q.where(eq(titulosPagar.fornecedor_id, fornecedor_id));
      if (from) q = q.where(titulosPagar.data_vencimento.gte(new Date(from)) as any);
      if (to) q = q.where(titulosPagar.data_vencimento.lte(new Date(to)) as any);

      const pageNum = Math.max(1, Number(page || 1));
      const limit = Math.min(500, Number(perPage || 50));
      const offset = (pageNum - 1) * limit;
      const rows = await q.orderBy(titulosPagar.data_vencimento).limit(limit).offset(offset as any);

      const [countRes] = await db.select({ cnt: db.raw('count(*)') }).from(titulosPagar as any).where(titulosPagar.deletado.equals(false));
      const total = Number((countRes && (countRes as any).cnt) || 0);

      const uniqCondIds = Array.from(new Set(rows.map((r: any) => r.condicao_pagamento_id).filter(Boolean)));
      const condMap: Record<<stringstring, any> = {};
      if (uniqCondIds.length) {
        for (const cid of uniqCondIds) {
          const [c] = await db.select().from(condicoesPagamento).where(eq(condicoesPagamento.id, cid)).limit(1);
          if (c) condMap[c.id] = c;
        }
      }

      const today = new Date();
      const msPerDay = 1000 * 60 * 60 * 24;
      const enriched = (rows || []).map((r: any) => {
        const venc = r.data_vencimento ? new Date(r.data_vencimento) : null;
        let daysLate = 0;
        if (venc) {
          daysLate = Math.max(0, Math.floor((today.getTime() - venc.getTime()) / msPerDay));
        }
        let jurosAccum = 0;
        const cond = r.condicao_pagamento_id ? condMap[r.condicao_pagamento_id] : null;
        if (daysLate > 0 && cond) {
          const jurosMonthlyPct = Number(cond.juros_percentual || 0);
          const jurosDaily = jurosMonthlyPct / 100 / 30;
          jurosAccum = Number((Number(r.valor_aberto || 0) * jurosDaily * daysLate).toFixed(2));
        }
        return { ...r, agingDays: daysLate, juros_acumulado: jurosAccum };
      });

      return res.status(200).json({ rows: enriched, page: pageNum, perPage: limit, total });
    }

    if (req.method === 'POST') {
      const { action } = req.query;
      const p = req.body;

      // --- LOGICA DE PREVIEW (SIMULACAO) ---
      if (action === 'preview') {
        const { valor_total, condicao_pagamento_id, data_base } = p;
        if (!condicao_pagamento_id || !valor_total) {
          return res.status(400).json({ error: 'Dados insuficientes para preview' });
        }

        const [cond] = await db.select().from(condicoesPagamento).where(eq(condicoesPagamento.id, condicao_pagamento_id)).limit(1);
        if (!cond) return res.status(400).json({ error: 'Condição não encontrada' });

        const nParcelas = Number(cond.parcelas || 1);
        const entradaPct = Number(cond.entrada_percentual || 0) / 100;
        const vTotal = Number(valor_total);
        const vEntrada = Number((vTotal * entradaPct).toFixed(2));
        const vRestante = Number((vTotal - vEntrada).toFixed(2));
        const vParcelaBase = Number((vRestante / (nParcelas || 1)).toFixed(2));
        
        const previewParcelas = [];
        const dtBase = data_base ? new Date(data_base) : new Date();

        for (let i = 0; i < nParcelas; i++) {
          const venc = new Date(dtBase.getTime());
          venc.setDate(dtBase.getDate() + i * 30);
          
          let valorFinalParcela = vParcelaBase;
          if (i === nParcelas - 1) {
            const somaVerif = vEntrada + (vParcelaBase * nParcelas);
            const diff = Number((vTotal - somaVerif).toFixed(2));
            valorFinalParcela = Number((vParcelaBase + diff).toFixed(2));
          }

          previewParcelas.push({
            numero_parcela: i + 1,
            valor: i === 0 && vEntrada > 0 ? vEntrada : valorFinalParcela,
            data_vencimento: venc.toISOString()
          });
        }
        return res.status(200).json({ parcelas: previewParcelas });
      }

      if (p.condicao_pagamento_id && p.valor_original) {
        const [cond] = await db.select().from(condicoesPagamento).where(eq(condicoesPagamento.id, p.condicao_pagamento_id)).limit(1);
        if (!cond) return res.status(400).json({ error: 'Condição de pagamento não encontrada' });

        const parcelas = Number(cond.parcelas || 1);
        const entradaPct = Number(cond.entrada_percentual || 0) / 100;
        const valorTotal = Number(p.valor_original || 0);
        const valorEntrada = Number((valorTotal * entradaPct).toFixed(2));
        const restante = Number((valorTotal - valorEntrada).toFixed(2));
        const valorParcelaBase = Number((restante / (parcelas || 1)).toFixed(2));
        const parcelasInsert: any[] = [];

        const dataEmissao = p.data_emissao ? new Date(p.data_emissao) : new Date();
        const primeiraVenc = p.data_vencimento ? new Date(p.data_vencimento) : new Date(dataEmissao);

        for (let i = 0; i << parcel parcelas; i++) {
          const parcelaNum = i + 1;
          const venc = new Date(primeiraVenc.getTime());
          venc.setDate(primeiraVenc.getDate() + i * 30);
          let valorParcela = valorParcelaBase;
          if (i === parcelas - 1) {
            const soma = valorEntrada + valorParcelaBase * parcelas;
            const diff = Number((valorTotal - soma).toFixed(2));
            valorParcela = Number((valorParcelaBase + diff).toFixed(2));
          }
          parcelasInsert.push({
            fornecedor_id: p.fornecedor_id,
            nota_fiscal: p.nota_fiscal || null,
            pedido_compra_id: p.pedido_compra_id || null,
            valor_original: parcelaNum === 1 && entradaPct > 0 ? valorEntrada : valorParcela,
            valor_liquido: parcelaNum === 1 && entradaPct > 0 ? valorEntrada : valorParcela,
            valor_juros: 0,
            valor_multa: 0,
            valor_desconto: 0,
            valor_aberto: parcelaNum === 1 && entradaPct > 0 ? valorEntrada : valorParcela,
            data_emissao: dataEmissao.toISOString(),
            data_vencimento: venc.toISOString(),
            data_competencia: dataEmissao.toISOString(),
            classe_financeira_id: p.classe_financeira_id,
            forma_pagamento_id: p.forma_pagamento_id,
            conta_bancaria_id: p.conta_bancaria_id,
            status: 'aberto',
            parcela: parcelaNum,
            total_parcelas: parcelas,
            condicao_pagamento_id: p.condicao_pagamento_id,
          });
        }

        const somaParcelas = parcelasInsert.reduce((s, it) => s + Number(it.valor_original), 0);
        if (Math.abs(somaParcelas - valorTotal) > 0.01) {
          return res.status(400).json({ error: 'Soma das parcelas não confere com valor original', somaParcelas, valorTotal });
        }

        const inserted: any[] = [];
        await db.transaction(async (tx) => {
          const [ctrRow] = await tx.select().from(counters).where(eq(counters.entidade, 'titulos_pagar')).limit(1);
          let seqVal = 1;
          if (!ctrRow) {
            const [insCtr] = await tx.insert(counters).values({ entidade: 'titulos_pagar', seq: 1 }).returning();
            seqVal = Number((insCtr as any).seq || 1);
          } else {
            const newSeq = Number((ctrRow as any).seq || 0) + 1;
            await tx.update(counters).set({ seq: newSeq }).where(eq(counters.id, (ctrRow as any).id));
            seqVal = newSeq;
          }
          const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const padded = String(seqVal).padStart(6, '0');
          const base = `TP-${datePart}-${padded}`;
          for (const it of parcelasInsert) {
            const parcelaStr = String(it.parcela).padStart(2, '0');
            it.numero_titulo = `${base}-${parcelaStr}`;
            it.criado_por = userId;
            it.atualizado_por = userId;
            const [ins] = await tx.insert(titulosPagar).values(it).returning();
            inserted.push(ins);
          }
        });
        return res.status(201).json(inserted);
      }

      const pSingle = req.body;
      let numero = pSingle.numero_titulo;
      let insertedSingle: any;
      await db.transaction(async (tx) => {
        const [ctrRow] = await tx.select().from(counters).where(eq(counters.entidade, 'titulos_pagar')).limit(1);
        let seqVal = 1;
        if (!ctrRow) {
          const [insCtr] = await tx.insert(counters).values({ entidade: 'titulos_pagar', seq: 1 }).returning();
          seqVal = Number((insCtr as any).seq || 1);
        } else {
          const newSeq = Number((ctrRow as any).seq || 0) + 1;
          await tx.update(counters).set({ seq: newSeq }).where(eq(counters.id, (ctrRow as any).id));
          seqVal = newSeq;
        }
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const padded = String(seqVal).padStart(6, '0');
        numero = numero || `TP-${datePart}-${padded}`;
        const [ins] = await tx.insert(titulosPagar).values({
          numero_titulo: numero,
          fornecedor_id: pSingle.fornecedor_id,
          nota_fiscal: pSingle.nota_fiscal || null,
          pedido_compra_id: pSingle.pedido_compra_id || null,
          valor_original: pSingle.valor_original,
          valor_liquido: pSingle.valor_liquido,
          valor_juros: pSingle.valor_juros || 0,
          valor_multa: pSingle.valor_multa || 0,
          valor_desconto: pSingle.valor_desconto || 0,
          valor_aberto: pSingle.valor_aberto,
          data_emissao: pSingle.data_emissao,
          data_vencimento: pSingle.data_vencimento,
          data_competencia: pSingle.data_competencia,
          classe_financeira_id: pSingle.classe_financeira_id,
          forma_pagamento_id: pSingle.forma_pagamento_id,
          conta_bancaria_id: pSingle.conta_bancaria_id,
          status: pSingle.status || 'aberto',
          parcela: pSingle.parcela || 1,
          total_parcelas: pSingle.total_parcelas || 1,
          condicao_pagamento_id: pSingle.condicao_pagamento_id,
          criado_por: userId,
          atualizado_por: userId,
        }).returning();
        insertedSingle = ins;
      });
      return res.status(201).json(insertedSingle);
    }

    if (req.method === 'PUT') {
      const p = req.body;
      await db.update(titulosPagar).set({
        valor_liquido: p.valor_liquido,
        data_vencimento: p.data_vencimento,
        status: p.status,
        atualizado_por: userId,
      }).where(eq(titulosPagar.id, p.id));
      const updated = await db.select().from(titulosPagar).where(eq(titulosPagar.id, p.id)).limit(1);
      return res.status(200).json(updated[0]);
    }

    if (req.method === 'DELETE') {
      const id = (req.query && (req.query.id as string)) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'id é obrigatório para deletar' });
      await db.update(titulosPagar).set({ deletado: true, excluido_em: new Date().toISOString(), atualizado_por: userId }).where(eq(titulosPagar.id, id));
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
