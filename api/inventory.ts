import { sql, extractAndVerifyToken } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { user, error } = extractAndVerifyToken(req);
  if (error) return res.status(401).json({ error });

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT * FROM inventory ORDER BY name ASC`;
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Apenas admins ou marceneiros deveriam alterar estoque pesado diretamente, 
  // mas vamos permitir todos os roles logados para simplificar o MVP.
  if (req.method === 'POST') {
    const { name, category, unit, quantity, min_quantity, location, price } = req.body;
    try {
      const result = await sql`
        INSERT INTO inventory (name, category, unit, quantity, min_quantity, location, price)
        VALUES (${name}, ${category}, ${unit}, ${quantity}, ${min_quantity}, ${location}, ${price})
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { quantity } = req.body; // usually just updating qty for now
    try {
      const result = await sql`
        UPDATE inventory SET
          quantity = ${quantity},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      return res.status(200).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (user?.role !== 'admin') return res.status(403).json({ error: 'Só admins podem deletar itens.' });
    try {
      await sql`DELETE FROM inventory WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
