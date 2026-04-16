import { sql, extractAndVerifyToken } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { user, error } = extractAndVerifyToken(req);
  if (error) return res.status(401).json({ error });

  const { method } = req;
  const { id } = req.query;

  try {
    if (method === 'GET') {
      if (id) {
        const result = await sql`SELECT * FROM fornecedores WHERE id = ${id}`;
        return res.status(200).json(result[0]);
      }
      const result = await sql`SELECT * FROM fornecedores WHERE ativo = true ORDER BY nome ASC`;
      return res.status(200).json(result);
    }

    if (method === 'POST') {
      const { nome, cnpj, contato, telefone, email, cidade, estado, observacoes } = req.body;
      const result = await sql`
        INSERT INTO fornecedores (nome, cnpj, contato, telefone, email, cidade, estado, observacoes)
        VALUES (${nome}, ${cnpj}, ${contato}, ${telefone}, ${email}, ${cidade}, ${estado}, ${observacoes})
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }

    if (method === 'PATCH') {
      const fields = req.body;
      const result = await sql`
        UPDATE fornecedores SET
          nome = ${fields.nome},
          cnpj = ${fields.cnpj},
          contato = ${fields.contato},
          telefone = ${fields.telefone},
          email = ${fields.email},
          cidade = ${fields.cidade},
          estado = ${fields.estado},
          observacoes = ${fields.observacoes}
        WHERE id = ${id}
        RETURNING *
      `;
      return res.status(200).json(result[0]);
    }

    if (method === 'DELETE') {
      if (user?.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
      await sql`UPDATE fornecedores SET ativo = false WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
