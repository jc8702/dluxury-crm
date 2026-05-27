import { apiCall } from '../lib/api.js';

export interface KanbanCardType {
  id: number;
  status_kanban: 'a_fazer' | 'em_progresso' | 'bloqueado' | 'concluido';
  etapa_nome: string;
  etapa_numero: number;
  operacao_prod_id: string;
  numero_op: string;
  orcamento_id: string;
  numero_orcamento: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  prioridade: number;
  environment: string;
  data_inicio: string | null;
  data_conclusao: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanBoardData {
  a_fazer: KanbanCardType[];
  em_progresso: KanbanCardType[];
  bloqueado: KanbanCardType[];
  concluido: KanbanCardType[];
}

export interface MovimentoKanbanType {
  id: number;
  etapa_kanban_id: number;
  status_anterior: string | null;
  status_novo: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  timestamp_movimento: string;
  nota: string | null;
}

export const kanbanService = {
  /**
   * Carrega os cartões agrupados pelas colunas do board Kanban
   */
  async getBoard(filtros?: {
    filtro_responsavel?: string;
    filtro_prioridade?: number;
    filtro_ambiente?: string;
    busca?: string;
  }): Promise<KanbanBoardData> {
    const params = new URLSearchParams();
    if (filtros) {
      if (filtros.filtro_responsavel) params.append('filtro_responsavel', filtros.filtro_responsavel);
      if (filtros.filtro_prioridade !== undefined) params.append('filtro_prioridade', String(filtros.filtro_prioridade));
      if (filtros.filtro_ambiente) params.append('filtro_ambiente', filtros.filtro_ambiente);
      if (filtros.busca) params.append('busca', filtros.busca);
    }
    const qs = params.toString();
    return apiCall<KanbanBoardData>(`kanban/board${qs ? `?${qs}` : ''}`);
  },

  /**
   * Movimenta uma etapa no kanban
   */
  async moveCard(
    etapaKanbanId: number,
    novoStatus: 'a_fazer' | 'em_progresso' | 'bloqueado' | 'concluido',
    statusAnterior: string,
    nota?: string
  ): Promise<any> {
    return apiCall<any>('kanban/move-card', 'POST', {
      etapa_kanban_id: etapaKanbanId,
      novo_status: novoStatus,
      status_anterior: statusAnterior,
      nota
    });
  },

  /**
   * Atualiza detalhes do cartão (responsável ou adição de notas/comentários)
   */
  async updateCardDetails(
    etapaKanbanId: number,
    responsavelId: string | null,
    nota?: string
  ): Promise<{ etapa: KanbanCardType; historico: MovimentoKanbanType[] }> {
    return apiCall<{ etapa: KanbanCardType; historico: MovimentoKanbanType[] }>('kanban/card-details', 'PATCH', {
      etapa_kanban_id: etapaKanbanId,
      responsavel_id: responsavelId,
      nota
    });
  },

  /**
   * Obtém o histórico de movimentos de um cartão
   */
  async getCardHistory(etapaKanbanId: number): Promise<MovimentoKanbanType[]> {
    return apiCall<MovimentoKanbanType[]>(`kanban/card-history?id=${etapaKanbanId}`);
  }
};
