import { EventosRepository } from "../infrastructure/EventosRepository.js";
import { Evento, EventoDomain, STATUS_VISITA } from "../domain/Evento.js";

export class AgendaService {
  private repository: EventosRepository;

  constructor() {
    this.repository = new EventosRepository();
  }

  async getCalendario(inicio: Date, fim: Date) {
    return await this.repository.list({ inicio, fim });
  }

  async getKanbanVisitas() {
    const eventos = await this.repository.list({ tipo: 'visita' });
    return EventoDomain.formatForKanban(eventos as any);
  }

  async agendarEvento(data: Evento) {
    // Lógica extra: verificar conflitos de agenda? 
    // Por enquanto, apenas cria.
    return await this.repository.create(data);
  }

  async atualizarEvento(id: string, data: Partial<Evento>) {
    return await this.repository.update(id, data);
  }

  async moverVisita(id: string, novoStatus: string) {
    const evento = await this.repository.getById(id);
    if (!evento) throw new Error("Evento não encontrado");
    
    if (!EventoDomain.canMoveTo(evento as any, novoStatus)) {
      throw new Error(`Transição de status inválida para ${novoStatus}`);
    }

    return await this.repository.updateStatus(id, novoStatus);
  }

  async realizarVisita(id: string, resultado: string) {
    return await this.repository.updateStatus(id, STATUS_VISITA.REALIZADO, resultado);
  }

  async removerEvento(id: string) {
    return await this.repository.delete(id);
  }

  async getDetalhesEvento(id: string) {
    const evento = await this.repository.getById(id);
    if (!evento) return null;

    const historico = await this.repository.getHistorico(id);
    return { ...evento, historico };
  }
}
