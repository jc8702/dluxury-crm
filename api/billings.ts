import { sql, validateAuth } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  
  // GET is public (read-only for team), POST/DELETE require PIN
  if (req.method !== 'GET' && !authorized) {
    return res.status(401).json({ error });
  }

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT * FROM billings ORDER BY data DESC, id DESC`;
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { nf, pedido, cliente, erp, valor, data, status = 'FATURADO' } = req.body;
    try {
      const result = await sql`
        INSERT INTO billings (nf, pedido, cliente, erp, valor, data, status)
        VALUES (${nf}, ${pedido}, ${cliente}, ${erp}, ${valor}, ${data}, ${status})
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { nf, pedido, cliente, erp, valor, data, status } = req.body;
    try {
      const result = await sql`
        UPDATE billings SET
          nf = COALESCE(${nf}, nf),
          pedido = COALESCE(${pedido}, pedido),
          cliente = COALESCE(${cliente}, cliente),
          erp = COALESCE(${erp}, erp),
          valor = COALESCE(${valor}, valor),
          data = COALESCE(${data}, data),
          status = COALESCE(${status}, status)
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
    try {
      await sql`DELETE FROM billings WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
