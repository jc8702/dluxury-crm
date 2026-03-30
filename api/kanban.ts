import { sql, validateAuth } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { authorized, error } = validateAuth(req);

  // GET is public (read-only for team), POST/PATCH require PIN
  if (req.method !== 'GET' && !authorized) {
    return res.status(401).json({ error });
  }

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT * FROM kanban_items ORDER BY updated_at DESC`;
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { title, subtitle, label, status, type } = req.body;
    try {
      const result = await sql`
        INSERT INTO kanban_items (title, subtitle, label, status, type)
        VALUES (${title}, ${subtitle}, ${label}, ${status}, ${type})
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const { id } = req.query;
    const { status } = req.body;
    try {
      const result = await sql`
        UPDATE kanban_items
        SET status = ${status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      return res.status(200).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
