import { apiCall } from '../lib/api.js';

export type TipoEventoType =
  | 'orcamento'
  | 'prazo_entrega'
  | 'lembrete_compra'
  | 'tarefa'
  | 'reuniao';

export interface EventoCalendarioType {
  id: string; // Ex: 'manual-1', 'op-uuid', 'orcamento-uuid'
  titulo: string;
  descricao: string;
  data_evento: string; // formato YYYY-MM-DD
  hora_evento?: string;
  tipo_evento: TipoEventoType;
  cor_categoria: string;
  concluido: boolean;
  quotation_id?: string;
  operacao_prod_id?: string;
  dias_restantes?: number;
  atrasado?: boolean;
  cliente_nome?: string;
}

export interface CriarEventoPayload {
  titulo: string;
  descricao?: string;
  data_evento: string;
  hora_evento?: string;
  tipo_evento: TipoEventoType;
  quotation_id?: string;
  operacao_prod_id?: string;
  cor_categoria?: string;
  notificacao_dias_antes?: number;
}

export const calendarService = {
  /**
   * Obtém os eventos do calendário para um mês e ano específicos
   */
  async getEventos(mes: number, ano: number, filtroTipo?: string): Promise<EventoCalendarioType[]> {
    const params = new URLSearchParams();
    params.append('mes', String(mes));
    params.append('ano', String(ano));
    if (filtroTipo) {
      params.append('filtro_tipo', filtroTipo);
    }
    const data = await apiCall<{ eventos: EventoCalendarioType[] }>(
      `calendario/eventos?${params.toString()}`,
    );
    return data.eventos || [];
  },

  /**
   * Cria um novo evento manual no calendário
   */
  async criarEvento(payload: CriarEventoPayload): Promise<any> {
    return apiCall<any>('calendario/criar-evento', 'POST', payload);
  },

  /**
   * Solicita a geração automática de eventos com base em orçamento aprovado
   */
  async gerarAutomatico(
    orcamentoId: string,
  ): Promise<{ sucesso: boolean; eventos_criados: number }> {
    return apiCall<{ sucesso: boolean; eventos_criados: number }>(
      'calendario/gerar-automatico',
      'POST',
      { quotation_id: orcamentoId },
    );
  },

  /**
   * Atualiza as informações de status ou cor de um evento manual
   */
  async updateEvento(
    id: number,
    data: { concluido?: boolean; cor_categoria?: string },
  ): Promise<any> {
    return apiCall<any>(`calendario?id=${id}`, 'PATCH', data);
  },

  /**
   * Remove um evento manual do calendário
   */
  async deleteEvento(id: number): Promise<any> {
    return apiCall<any>(`calendario?id=${id}`, 'DELETE');
  },

  /**
   * Executa a verificação e envio automático de lembretes (job administrativo)
   */
  async verificarLembretes(): Promise<{ sucesso: boolean; notificacoes_disparadas: number }> {
    return apiCall<{ sucesso: boolean; notificacoes_disparadas: number }>(
      'calendario/verificar-lembretes',
    );
  },
};
