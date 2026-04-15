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
    const { descricao, tipo, projectId, valor, data, categoria, status = 'PAGO', nf, pedido, cliente } = req.body;
    try {
      const result = await sql`
        INSERT INTO billings (descricao, tipo, project_id, valor, data, categoria, status, nf, pedido, cliente)
        VALUES (
          ${descricao || nf || ''}, 
          ${tipo || 'entrada'}, 
          ${projectId || null},
          ${valor}, 
          ${data}, 
          ${categoria || 'outros'}, 
          ${status},
          ${nf || descricao || ''},
          ${pedido || '-'},
          ${cliente || '-'}
        )
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { descricao, tipo, valor, data, categoria, status, projectId } = req.body;
    try {
      const result = await sql`
        UPDATE billings SET
          descricao = COALESCE(${descricao}, descricao),
          tipo = COALESCE(${tipo}, tipo),
          valor = COALESCE(${valor}, valor),
          data = COALESCE(${data}, data),
          categoria = COALESCE(${categoria}, categoria),
          status = COALESCE(${status}, status),
          project_id = COALESCE(${projectId}, project_id)
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
