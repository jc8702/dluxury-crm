import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../lib/db';
import { titulosReceber, condicoesPagamento, counters } from '../../../db/schema/financeiro';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Tentativa simples de identificar usuário a partir do header x-user-id.
    // Se não informado, usamos fallback 'bypass-id'.
    const userIdHeader = (req.headers && (req.headers['x-user-id'] as string)) || '';
    // Tenta extrair do Authorization Bearer <token> (decodificando payload JWT sem verificar)
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
    } catch (e) {
      // ignore parse errors
    }
    if (!userId) userId = 'bypass-id';

    if (req.method === 'GET') {
      // Suporta filtros: status, cliente_id, periodo (from,to), paginação e showDeleted
      const { status, cliente_id, from, to, page = '1', perPage = '50', showDeleted = 'false' } = req.query as any;
      const includeDeleted = String(showDeleted) === 'true';

      let q = db.select().from(titulosReceber as any);
      if (!includeDeleted) q = q.where(titulosReceber.deletado.equals(false));
      if (status) q = q.where(eq(titulosReceber.status, status));
      if (cliente_id) q = q.where(eq(titulosReceber.cliente_id, cliente_id));
      if (from) q = q.where(titulosReceber.data_vencimento.gte(new Date(from)) as any);
      if (to) q = q.where(titulosReceber.data_vencimento.lte(new Date(to)) as any);

      const pageNum = Math.max(1, Number(page || 1));
      const limit = Math.min(500, Number(perPage || 50));
      const offset = (pageNum - 1) * limit;
      const rows = await q.orderBy(titulosReceber.data_vencimento).limit(limit).offset(offset as any);

      // total count (simple)
      const [countRes] = await db.select({ cnt: db.raw('count(*)') }).from(titulosReceber as any).where(titulosReceber.deletado.equals(false));
      const total = Number((countRes && (countRes as any).cnt) || 0);

      // calcular aging e juros acumulado baseado em condicao_pagamento (se presente)
      const uniqCondIds = Array.from(new Set(rows.map((r: any) => r.condicao_pagamento_id).filter(Boolean)));
      const condMap: Record<string, any> = {};
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
          const jurosDaily = jurosMonthlyPct / 100 / 30; // aproximação
          jurosAccum = Number((Number(r.valor_aberto || 0) * jurosDaily * daysLate).toFixed(2));
        }
        return { ...r, agingDays: daysLate, juros_acumulado: jurosAccum };
      });

      return res.status(200).json({ rows: enriched, page: pageNum, perPage: limit, total });
    }

    if (req.method === 'POST') {
      const p = req.body;

      // Se uma condição de pagamento for informada, vamos gerar parcelas automaticamente
      if (p.condicao_pagamento_id && p.valor_original) {
        const [cond] = await db.select().from(condicoesPagamento).where(eq(condicoesPagamento.id, p.condicao_pagamento_id)).limit(1);
        if (!cond) return res.status(400).json({ error: 'Condição de pagamento não encontrada' });

        const parcelas = Number(cond.parcelas || 1);
        const entradaPct = Number(cond.entrada_percentual || 0) / 100;
        const jurosPct = Number(cond.juros_percentual || 0) / 100;
        const valorTotal = Number(p.valor_original || 0);

        // Calcula entrada e resto
        const valorEntrada = Number((valorTotal * entradaPct).toFixed(2));
        const restante = Number((valorTotal - valorEntrada).toFixed(2));

        // distribui restante em parcelas iguais (arredondando o último com o resto)
        const valorParcelaBase = Number((restante / (parcelas || 1)).toFixed(2));
        const parcelasInsert: any[] = [];

        const dataEmissao = p.data_emissao ? new Date(p.data_emissao) : new Date();
        const primeiraVenc = p.data_vencimento ? new Date(p.data_vencimento) : new Date(dataEmissao);

        for (let i = 0; i < parcelas; i++) {
          const parcelaNum = i + 1;
          // vencimento: primeira + i * 30 dias
          const venc = new Date(primeiraVenc.getTime());
          venc.setDate(primeiraVenc.getDate() + i * 30);
          let valorParcela = valorParcelaBase;
          // last parcel absorbs rounding difference
          if (i === parcelas - 1) {
            const soma = valorEntrada + valorParcelaBase * parcelas;
            const diff = Number((valorTotal - soma).toFixed(2));
            valorParcela = Number((valorParcelaBase + diff).toFixed(2));
          }

          parcelasInsert.push({
            cliente_id: p.cliente_id,
            projeto_id: p.projeto_id || null,
            orcamento_id: p.orcamento_id || null,
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
            forma_recebimento_id: p.forma_recebimento_id,
            status: 'aberto',
            parcela: parcelaNum,
            total_parcelas: parcelas,
          });
        }

        // valida soma das parcelas == valorTotal (aceita diferença até 0.01)
        const somaParcelas = parcelasInsert.reduce((s, it) => s + Number(it.valor_original), 0);
        if (Math.abs(somaParcelas - valorTotal) > 0.01) {
          return res.status(400).json({ error: 'Soma das parcelas não confere com valor original', somaParcelas, valorTotal });
        }

        // Inserção transacional com seq counters para numero (gera um numero base sequencial)
        const inserted: any[] = [];
        await db.transaction(async (tx) => {
          // read or create counter and increment
          const [ctrRow] = await tx.select().from(counters).where(eq(counters.entidade, 'titulos_receber')).limit(1);
          let seqVal = 1;
          if (!ctrRow) {
            const [insCtr] = await tx.insert(counters).values({ entidade: 'titulos_receber', seq: 1 }).returning();
            seqVal = Number((insCtr as any).seq || 1);
          } else {
            const newSeq = Number((ctrRow as any).seq || 0) + 1;
            await tx.update(counters).set({ seq: newSeq }).where(eq(counters.id, (ctrRow as any).id));
            seqVal = newSeq;
          }

          const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const padded = String(seqVal).padStart(6, '0');
          const base = `TR-${datePart}-${padded}`;

          for (const it of parcelasInsert) {
            const parcelaStr = String(it.parcela).padStart(2, '0');
            it.numero_titulo = `${base}-${parcelaStr}`;
            // preencher auditoria
            it.criado_por = userId;
            it.atualizado_por = userId;
            const [ins] = await tx.insert(titulosReceber).values(it).returning();
            inserted.push(ins);
          }
        });
        return res.status(201).json(inserted);
      }

      // fallback comportamento simples (um título)
      const p = req.body;
      let numero = p.numero_titulo;
      let inserted: any;
      await db.transaction(async (tx) => {
        // reserve seq
        const [ctrRow] = await tx.select().from(counters).where(eq(counters.entidade, 'titulos_receber')).limit(1);
        let seqVal = 1;
        if (!ctrRow) {
          const [insCtr] = await tx.insert(counters).values({ entidade: 'titulos_receber', seq: 1 }).returning();
          seqVal = Number((insCtr as any).seq || 1);
        } else {
          const newSeq = Number((ctrRow as any).seq || 0) + 1;
          await tx.update(counters).set({ seq: newSeq }).where(eq(counters.id, (ctrRow as any).id));
          seqVal = newSeq;
        }
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const padded = String(seqVal).padStart(6, '0');
        numero = numero || `TR-${datePart}-${padded}`;

        const [ins] = await tx.insert(titulosReceber).values({
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
          criado_por: userId,
          atualizado_por: userId,
        }).returning();
        inserted = ins;
      });
      return res.status(201).json(inserted);
    }

    if (req.method === 'PUT') {
      const p = req.body;
      await db.update(titulosReceber).set({
        valor_liquido: p.valor_liquido,
        valor_desconto: p.valor_desconto,
        data_vencimento: p.data_vencimento,
        status: p.status,
        atualizado_por: userId,
      }).where(eq(titulosReceber.id, p.id));
      const updated = await db.select().from(titulosReceber).where(eq(titulosReceber.id, p.id)).limit(1);
      return res.status(200).json(updated[0]);
    }

    if (req.method === 'DELETE') {
      // Soft-delete: marcar deletado=true, set excluido_em e atualizado_por
      const id = (req.query && (req.query.id as string)) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'id é obrigatório para deletar' });
      await db.update(titulosReceber).set({ deletado: true, excluido_em: new Date().toISOString(), atualizado_por: userId }).where(eq(titulosReceber.id, id));
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
