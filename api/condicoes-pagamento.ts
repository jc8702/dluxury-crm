import { sql, validateAuth } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT * FROM condicoes_pagamento WHERE ativo = true ORDER BY n_parcelas ASC`;
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { nome, n_parcelas } = req.body;
    try {
      const result = await sql`
        INSERT INTO condicoes_pagamento (nome, n_parcelas)
        VALUES (${nome}, ${n_parcelas})
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { nome, n_parcelas, ativo } = req.body;
    try {
      const result = await sql`
        UPDATE condicoes_pagamento SET
          nome = COALESCE(${nome}, nome),
          n_parcelas = COALESCE(${n_parcelas}, n_parcelas),
          ativo = COALESCE(${ativo}, ativo)
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
      await sql`DELETE FROM condicoes_pagamento WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  res.status(405).end('Method Not Allowed');
}
