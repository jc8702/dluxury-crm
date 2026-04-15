import { sql, extractAndVerifyToken } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { user, error } = extractAndVerifyToken(req);
  if (error || user?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem gerenciar usuários' });
  }

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC`;
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      if (id === user.id) return res.status(400).json({ error: 'Você não pode excluir a si mesmo' });
      await sql`DELETE FROM users WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
