import { sql, validateAuth } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });

  const { method } = req;

  try {
    if (method === 'GET') {
      const { clienteId } = req.query;
      let simulations;
      
      if (clienteId) {
        simulations = await sql`
          SELECT * FROM erp_simulations 
          WHERE cliente_id = ${clienteId} 
          ORDER BY created_at DESC
        `;
      } else {
        simulations = await sql`
          SELECT * FROM erp_simulations 
          ORDER BY created_at DESC
        `;
      }
      
      return res.status(200).json(simulations);
    }

    if (method === 'POST') {
      const { cliente_id, cliente_nome, dados_simulacao, dados_input } = req.body;
      
      if (!dados_simulacao || !dados_input) {
        return res.status(400).json({ error: 'Dados de simulação e input são obrigatórios' });
      }

      const result = await sql`
        INSERT INTO erp_simulations (cliente_id, cliente_nome, dados_simulacao, dados_input)
        VALUES (${cliente_id}, ${cliente_nome}, ${JSON.stringify(dados_simulacao)}, ${JSON.stringify(dados_input)})
        RETURNING *
      `;
      
      return res.status(201).json(result[0]);
    }

    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
      
      await sql`DELETE FROM erp_simulations WHERE id = ${id}`;
      return res.status(200).json({ message: 'Simulação excluída com sucesso' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${method} Not Allowed`);
    
  } catch (e: any) {
    console.error('Erro no handler de simulações:', e);
    return res.status(500).json({ error: e.message });
  }
}
