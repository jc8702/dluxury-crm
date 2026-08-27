import { EventosRepository } from '../infrastructure/EventosRepository.js';
import { Evento, EventoDomain, STATUS_VISITA } from '../domain/Evento.js';

export class AgendaService {
  private repository: EventosRepository;

  constructor() {
    this.repository = new EventosRepository();
  }

  async getCalendario(inicio: Date, fim: Date, tenantId: string) {
    return await this.repository.list(tenantId, { inicio, fim });
  }

  async getKanbanVisitas(tenantId: string) {
    const eventos = await this.repository.list(tenantId, { tipo: 'visita' });
    return EventoDomain.formatForKanban(eventos as any);
  }

  async agendarEvento(data: Evento, tenantId: string) {
    // Lógica extra: verificar conflitos de agenda?
    // Por enquanto, apenas cria.
    return await this.repository.create(data, tenantId);
  }

  async atualizarEvento(id: string, data: Partial<Evento>, tenantId: string) {
    return await this.repository.update(id, data, tenantId);
  }

  async moverVisita(id: string, novoStatus: string, tenantId: string) {
    const evento = await this.repository.getById(id, tenantId);
    if (!evento) throw new Error('Evento não encontrado');

    if (!EventoDomain.canMoveTo(evento as any, novoStatus)) {
      throw new Error(`Transição de status inválida para ${novoStatus}`);
    }

    return await this.repository.updateStatus(id, novoStatus, tenantId);
  }

  async realizarVisita(id: string, resultado: string, tenantId: string) {
    return await this.repository.updateStatus(id, STATUS_VISITA.REALIZADO, tenantId, resultado);
  }

  async removerEvento(id: string, tenantId: string) {
    return await this.repository.delete(id, tenantId);
  }

  async getDetalhesEvento(id: string, tenantId: string) {
    const evento = await this.repository.getById(id, tenantId);
    if (!evento) return null;

    const historico = await this.repository.getHistorico(id, tenantId);
    return { ...evento, historico };
  }
}
