import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../lib/db';
import { titulosReceber, titulosPagar, contasInternas } from '../../../db/schema/financeiro';
import { eq, and, gte, lte } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { conta_id, start_date, end_date } = req.query as any;
    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = end_date ? new Date(end_date) : new Date();
    endDate.setMonth(endDate.getMonth() + 3); // Default 3 months view

    // 1. Get current balance of selected account or all
    let startingBalance = 0;
    if (conta_id) {
      const [conta] = await db.select().from(contasInternas).where(eq(contasInternas.id, conta_id)).limit(1);
      startingBalance = Number(conta?.saldo_atual || 0);
    } else {
      const allContas = await db.select().from(contasInternas);
      startingBalance = allContas.reduce((acc, c) => acc + Number(c.saldo_atual || 0), 0);
    }

    // 2. Get predicted inflows (Títulos a Receber)
    const inflows = await db.select().from(titulosReceber)
      .where(
        and(
          titulosReceber.deletado.equals(false),
          titulosReceber.status.notEquals('pago'),
          titulosReceber.data_vencimento.gte(startDate),
          titulosReceber.data_vencimento.lte(endDate)
        )
      ).orderBy(titulosReceber.data_vencimento);

    // 3. Get predicted outflows (Títulos a Pagar)
    const outflows = await db.select().from(titulosPagar)
      .where(
        and(
          titulosPagar.deletado.equals(false),
          titulosPagar.status.notEquals('pago'),
          titulosPagar.data_vencimento.gte(startDate),
          titulosPagar.data_vencimento.lte(endDate)
        )
      ).orderBy(titulosPagar.data_vencimento);

    // 4. Aggregate by date (Daily Grid)
    const grid: Record<<stringstring, { inflows: number, outflows: number, balance: number }> = {};
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      grid[dateStr] = { inflows: 0, outflows: 0, balance: 0 };
      current.setDate(current.getDate() + 1);
    }

    inflows.forEach(t => {
      const d = new Date(t.data_vencimento).toISOString().slice(0, 10);
      if (grid[d]) grid[d].inflows += Number(t.valor_aberto || 0);
    });

    outflows.forEach(t => {
      const d = new Date(t.data_vencimento).toISOString().slice(0, 10);
      if (grid[d]) grid[d].outflows += Number(t.valor_aberto || 0);
    });

    // Calculate running balance
    let runningBalance = startingBalance;
    const sortedDates = Object.keys(grid).sort();
    const finalGrid = sortedDates.map(date => {
      const day = grid[date];
      const dayBalance = day.inflows - day.outflows;
      runningBalance += dayBalance;
      return {
        date,
        inflows: day.inflows,
        outflows: day.outflows,
        projectedBalance: runningBalance
      };
    });

    return res.status(200).json({
      startingBalance,
      grid: finalGrid,
      totalInflows: inflows.reduce((acc, t) => acc + Number(t.valor_aberto || 0), 0),
      totalOutflows: outflows.reduce((acc, t) => acc + Number(t.valor_aberto || 0), 0),
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
