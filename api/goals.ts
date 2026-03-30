import { sql, validateAuth } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT period, amount FROM monthly_goals ORDER BY period ASC`;
      const goals: Record<string, number> = {};
      result.forEach(row => {
        goals[row.period] = parseFloat(row.amount);
      });
      return res.status(200).json(goals);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { period, amount } = req.body;
    try {
      const result = await sql`
        INSERT INTO monthly_goals (period, amount)
        VALUES (${period}, ${amount})
        ON CONFLICT (period) DO UPDATE SET amount = ${amount}, updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      return res.status(200).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
