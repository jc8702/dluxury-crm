
import { validateAuth } from './_db.js';
import { AgendaService } from '../modules/agenda/application/AgendaService.js';

const agendaService = new AgendaService();

export async function handleAgenda(req: any, res: any) {
  try {
    const { method, query: q, body } = req;
    const { id, action } = q;

    const { authorized, error, user } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });

    // Roteamento baseado em recurso/ação
    if (method === 'GET') {
      // Listagem para o Kanban
      if (action === 'kanban') {
        const data = await agendaService.getKanbanVisitas();
        return res.status(200).json({ success: true, data });
      }

      // Detalhes de um evento específico
      if (id) {
        const data = await agendaService.getDetalhesEvento(id);
        if (!data) return res.status(404).json({ success: false, error: 'Evento não encontrado' });
        return res.status(200).json({ success: true, data });
      }

      // Listagem para o Calendário (filtros de data)
      const inicio = q.inicio ? new Date(q.inicio) : undefined;
      const fim = q.fim ? new Date(q.fim) : undefined;
      const data = await agendaService.getCalendario(inicio as any, fim as any);
      return res.status(200).json({ success: true, data });
    }

    if (method === 'POST') {
      // Criar novo evento
      const data = await agendaService.agendarEvento({
        ...body,
        criado_por: user?.id || 'system'
      });
      return res.status(201).json({ success: true, data });
    }

    if (method === 'PATCH' || method === 'PUT') {
      if (!id) return res.status(400).json({ success: false, error: 'ID não informado' });

      // Ação específica de movimentação no Kanban
      if (action === 'mover') {
        const { status_visita } = body;
        const data = await agendaService.moverVisita(id, status_visita);
        return res.status(200).json({ success: true, data });
      }

      // Ação de realizar visita (com resultado)
      if (action === 'realizar') {
        const { resultado_visita } = body;
        const data = await agendaService.realizarVisita(id, resultado_visita);
        return res.status(200).json({ success: true, data });
      }

      // Atualização genérica
      const data = await agendaService.atualizarEvento(id, body);
      return res.status(200).json({ success: true, data });
    }

    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ success: false, error: 'ID não informado' });
      await agendaService.removerEvento(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error('[AGENDA API ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
