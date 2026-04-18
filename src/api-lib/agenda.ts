import { sql, validateAuth } from './_db.js';

export async function handleAgenda(req: any, res: any) {
  try {
    const { method } = req;
    const { id } = req.query;

    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });

    if (method === 'GET') {
      const { inicio, fim, responsavel } = req.query;
      let query = sql`SELECT e.*, c.nome as cliente_nome, p.ambiente as projeto_nome FROM eventos_agenda e LEFT JOIN clients c ON e.cliente_id = c.id LEFT JOIN projects p ON e.projeto_id = p.id WHERE 1=1`;
      
      if (inicio && fim) {
        query = sql`${query} AND e.data_inicio >= ${inicio} AND e.data_inicio <= ${fim}`;
      }
      if (responsavel && responsavel !== 'todos') {
        query = sql`${query} AND (e.responsavel = ${responsavel} OR e.responsavel = 'ambos')`;
      }

      const result = await query;
      return res.status(200).json({ success: true, data: result });
    }

    if (method === 'POST') {
      const f = req.body;
      const result = await sql`
        INSERT INTO eventos_agenda (titulo, tipo, data_inicio, data_fim, dia_inteiro, cliente_id, projeto_id, visita_id, chamado_id, responsavel, local, observacoes, status, cor)
        VALUES (${f.titulo}, ${f.tipo}, ${f.data_inicio}, ${f.data_fim || null}, ${f.dia_inteiro || false}, ${f.cliente_id || null}, ${f.projeto_id || null}, ${f.visita_id || null}, ${f.chamado_id || null}, ${f.responsavel}, ${f.local}, ${f.observacoes}, ${f.status || 'agendado'}, ${f.cor})
        RETURNING *
      `;
      return res.status(201).json({ success: true, data: result[0] });
    }

    if (method === 'PATCH' || method === 'PUT') {
      const f = req.body;
      const result = await sql`
        UPDATE eventos_agenda SET
          titulo = COALESCE(${f.titulo}, titulo),
          tipo = COALESCE(${f.tipo}, tipo),
          data_inicio = COALESCE(${f.data_inicio}, data_inicio),
          data_fim = COALESCE(${f.data_fim}, data_fim),
          dia_inteiro = COALESCE(${f.dia_inteiro}, dia_inteiro),
          status = COALESCE(${f.status}, status),
          responsavel = COALESCE(${f.responsavel}, responsavel),
          observacoes = COALESCE(${f.observacoes}, observacoes),
          cor = COALESCE(${f.cor}, cor)
        WHERE id = ${id} RETURNING *
      `;
      return res.status(200).json({ success: true, data: result[0] });
    }

    if (method === 'DELETE') {
      await sql`DELETE FROM eventos_agenda WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    if (method === 'POST' && req.url.includes('sincronizar')) {
      // Importar visitas existentes que ainda não são eventos
      const query = await sql`
        INSERT INTO eventos_agenda (titulo, tipo, data_inicio, responsavel, visita_id, cliente_id, status, cor)
        SELECT 
          'Visita: ' || title, 
          'visita_comercial', 
          date_time, 
          'comercial', 
          id, 
          NULL, -- client_id not directly in kanban_items table, logic would need join
          'agendado', 
          '#E2AC00'
        FROM kanban_items
        WHERE date_time IS NOT NULL 
        AND id NOT IN (SELECT visita_id FROM eventos_agenda WHERE visita_id IS NOT NULL)
      `;
      return res.status(200).json({ success: true, message: 'Visitas sincronizadas com sucesso' });
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// Função auxiliar para disparar criação de evento (será chamada de outros handlers)
export async function registrarEventoAutomatico(evento: any) {
  try {
    await sql`
      INSERT INTO eventos_agenda (titulo, tipo, data_inicio, responsavel, visita_id, projeto_id, cliente_id, status, cor)
      VALUES (${evento.titulo}, ${evento.tipo}, ${evento.data_inicio}, ${evento.responsavel}, ${evento.visita_id || null}, ${evento.projeto_id || null}, ${evento.cliente_id || null}, 'agendado', ${evento.cor})
    `;
    return true;
  } catch (e) {
    console.error('Erro ao sincronizar evento:', e);
    return false;
  }
}
