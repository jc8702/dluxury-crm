import { sql, validateAuth } from './lib/_db.js';
import { writeOffStockForProject } from './lib/_inventory.js';

export default async function handler(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (req.method !== 'GET' && !authorized) {
    return res.status(401).json({ error });
  }

  if (req.method === 'GET') {
    try {
      const { client_id, status } = req.query;
      let result;
      if (client_id) {
        result = await sql`SELECT * FROM projects WHERE client_id = ${client_id} ORDER BY created_at DESC`;
      } else if (status) {
        result = await sql`SELECT * FROM projects WHERE status = ${status} ORDER BY created_at DESC`;
      } else {
        result = await sql`SELECT * FROM projects ORDER BY updated_at DESC`;
      }
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const {
      client_id, client_name, ambiente, descricao,
      valor_estimado, valor_final, prazo_entrega,
      status, etapa_producao, responsavel, observacoes
    } = req.body;
    try {
      const result = await sql`
        INSERT INTO projects (
          client_id, client_name, ambiente, descricao,
          valor_estimado, valor_final, prazo_entrega,
          status, etapa_producao, responsavel, observacoes
        )
        VALUES (
          ${client_id}, ${client_name}, ${ambiente}, ${descricao},
          ${valor_estimado}, ${valor_final}, ${prazo_entrega},
          ${status || 'lead'}, ${etapa_producao}, ${responsavel}, ${observacoes}
        )
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const { id } = req.query;
    const {
      client_id, client_name, ambiente, descricao,
      valor_estimado, valor_final, prazo_entrega,
      status, etapa_producao, responsavel, observacoes
    } = req.body;
    try {
      const result = await sql`
        UPDATE projects SET
          client_id = COALESCE(${client_id}, client_id),
          client_name = COALESCE(${client_name}, client_name),
          ambiente = COALESCE(${ambiente}, ambiente),
          descricao = COALESCE(${descricao}, descricao),
          valor_estimado = COALESCE(${valor_estimado}, valor_estimado),
          valor_final = COALESCE(${valor_final}, valor_final),
          prazo_entrega = COALESCE(${prazo_entrega}, prazo_entrega),
          status = COALESCE(${status}, status),
          etapa_producao = COALESCE(${etapa_producao}, etapa_producao),
          responsavel = COALESCE(${responsavel}, responsavel),
          observacoes = COALESCE(${observacoes}, observacoes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length > 0 && status === 'concluido') {
        // Buscar itens industriais deste projeto para dar baixa
        const items = await sql`SELECT id FROM erp_project_items WHERE project_id = ${id} OR project_id = (SELECT id::text FROM projects WHERE id = ${id})`;
        
        for (const item of items) {
          await writeOffStockForProject(item.id);
        }
      }

      return res.status(200).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await sql`DELETE FROM projects WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
