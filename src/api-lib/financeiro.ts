import { sql, validateAuth } from './_db.js';
import { Billing } from './types.js';

export async function handleBillings(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM billings ORDER BY due_date DESC`;
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'POST') {
      const { description, amount, type, due_date, status, category } = req.body;
      const result = await sql`INSERT INTO billings (description, amount, type, due_date, status, category) VALUES (${description}, ${amount}, ${type}, ${due_date}, ${status || 'pending'}, ${category}) RETURNING *`;
      return res.status(201).json({ success: true, data: result[0] });
    }
    if (req.method === 'PATCH') {
      const { id } = req.query;
      const f = req.body;
      const result = await sql`UPDATE billings SET status = COALESCE(${f.status}, status), description = COALESCE(${f.description}, description) WHERE id = ${id} RETURNING *`;
      return res.status(200).json({ success: true, data: result[0] });
    }
    if (req.method === 'DELETE') {
      await sql`DELETE FROM billings WHERE id = ${req.query.id}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
