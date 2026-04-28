import { sql } from './_db.js';

export async function handleAfterSales(req: any, res: any) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = Object.fromEntries(url.searchParams.entries());

    if (req.method === 'GET') {
      if (query.stats === 'true') {
        const stats = await sql`
          SELECT 
            COUNT(*) as total_abertos,
            (SELECT COUNT(*) FROM chamados_garantia WHERE status = 'resolvido') as total_resolvidos,
            (SELECT AVG(EXTRACT(EPOCH FROM (data_resolucao - data_abertura))/86400) FROM chamados_garantia WHERE data_resolucao IS NOT NULL) as tempo_medio
          FROM chamados_garantia WHERE status != 'resolvido'
        `;
        return res.status(200).json({ success: true, data: stats[0] });
      }

      const chamados = await sql`
        SELECT c.*, cl.nome as cliente_nome, p.ambiente as projeto_ambiente
        FROM chamados_garantia c
        JOIN clients cl ON c.cliente_id = cl.id
        LEFT JOIN projects p ON c.projeto_id = p.id
        ORDER BY c.data_abertura DESC
      `;
      return res.status(200).json({ success: true, data: chamados });
    }

    if (req.method === 'POST') {
      const { cliente_id, projeto_id, titulo, descricao, tipo, prioridade, data_agendamento } = req.body;
      
      // Gerar número automático GAR-2025-001
      const year = new Date().getFullYear();
      const [{ count }] = await sql`SELECT COUNT(*) as count FROM chamados_garantia WHERE EXTRACT(YEAR FROM created_at) = ${year}`;
      const numero = `GAR-${year}-${(Number(count) + 1).toString().padStart(3, '0')}`;

      // Verificar garantia (1 ano após entrega do projeto) - Simulação simplificada
      const dentro_garantia = true; 

      const [chamado] = await sql`
        INSERT INTO chamados_garantia (cliente_id, projeto_id, numero, titulo, descricao, tipo, prioridade, dentro_garantia, data_agendamento)
        VALUES (${cliente_id}, ${projeto_id}, ${numero}, ${titulo}, ${descricao}, ${tipo}, ${prioridade}, ${dentro_garantia}, ${data_agendamento})
        RETURNING *
      `;

      // Integrar com Visitas se houver agendamento
      if (data_agendamento) {
        await sql`
          INSERT INTO kanban_items (title, subtitle, label, status, type, visit_date, visit_time, visit_type, observations)
          VALUES (
            ${titulo}, 
            ${'Visita de Assistência Técnica'}, 
            ${'Pós-venda'}, 
            'agendado', 
            'visit', 
            ${data_agendamento.split('T')[0]}, 
            ${data_agendamento.split('T')[1]?.substring(0, 5) || '09:00'},
            'Garantia/Pós-venda',
            ${`Chamado: ${numero}\nDesc: ${descricao}`}
          )
        `;
      }

      return res.status(201).json({ success: true, data: chamado });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { id, status, solucao_aplicada, responsavel, custo_atendimento } = req.body;
      const data_resolucao = status === 'resolvido' ? new Date() : null;

      const [resultado] = await sql`
        UPDATE chamados_garantia 
        SET 
          status = ${status}, 
          solucao_aplicada = ${solucao_aplicada}, 
          responsavel = ${responsavel},
          custo_atendimento = ${custo_atendimento},
          data_resolucao = COALESCE(${data_resolucao}, data_resolucao),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      return res.status(200).json({ success: true, data: resultado });
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error('AFTER_SALES_ERROR:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
