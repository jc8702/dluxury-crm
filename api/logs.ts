import { sql, validateAuth } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  // GET logs (Admin only), POST logs (System/Public)
  if (req.method === 'GET') {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ error });

    try {
      const result = await sql`SELECT * FROM system_logs ORDER BY id DESC LIMIT 50`;
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { type, severity, message } = req.body;
    try {
      const result = await sql`
        INSERT INTO system_logs (type, severity, message)
        VALUES (${type}, ${severity}, ${message})
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    } catch (e: any) {
      // Falha ao logar não deve quebrar a aplicação, mas retornamos erro
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
