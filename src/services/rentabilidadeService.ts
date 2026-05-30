import { apiCall } from '../lib/api.js';

export interface KPIRentabilidade {
  receita_total: number;
  custo_total: number;
  margem_total: number;
  margem_media_percentual: number;
  variacao_receita: number;
  variacao_custos: number;
  variacao_margem: number;
  variacao_margem_percentual: number;
}

export interface ProjetoRentabilidade {
  id: number;
  quotation_id: string;
  numero_op: string;
  numero_orcamento: string;
  cliente: string;
  valor_venda: number;
  custo_total_estimado: number;
  custo_total_real: number;
  custo_material_real: number;
  custo_mao_obra_real: number;
  custo_retrabalho: number;
  custo_desperdicio_material: number;
  tempo_horas_real: number;
  margem_real: number;
  margem_percentual: number;
  variacao_custo_percentual: number;
  status: 'lucrativo' | 'equilibrio' | 'prejuizo';
  descricao_desvios: string | null;
}

export interface AlertaRentabilidade {
  quotation_id: string;
  numero_op: string;
  cliente: string;
  variacao_percentual: number;
  margem_percentual_real: number;
  descricao_desvios: string;
}

export interface ClienteRentabilidade {
  cliente: string;
  cliente_id: number;
  total_pedidos: number;
  total_vendido: number;
  total_custos_reais: number;
  margem_total: number;
  margem_media_percentual: number;
  operacoes_lucrativas: number;
  operacoes_prejuizadas: number;
  score_rentabilidade: number;
  ultimo_pedido_data: string | null;
}

export interface GraficoMargemDado {
  mes: string;
  margem_estimada: number;
  margem_real: number;
}

export const rentabilidadeService = {
  async getKPIs(periodo: string, dataInicio?: string, dataFim?: string): Promise<KPIRentabilidade> {
    const params = new URLSearchParams({ periodo });
    if (dataInicio) params.append('data_inicio', dataInicio);
    if (dataFim) params.append('data_fim', dataFim);
    return apiCall<KPIRentabilidade>(`rentabilidade/kpi?${params.toString()}`);
  },

  async getProjetos(cliente?: string): Promise<{ projetos: ProjetoRentabilidade[] }> {
    const params = new URLSearchParams();
    if (cliente) params.append('cliente', cliente);
    return apiCall<{ projetos: ProjetoRentabilidade[] }>(`rentabilidade/projetos?${params.toString()}`);
  },

  async getAlertas(): Promise<{ alertas: AlertaRentabilidade[] }> {
    return apiCall<{ alertas: AlertaRentabilidade[] }>('rentabilidade/alertas');
  },

  async getPorCliente(): Promise<{ clientes: ClienteRentabilidade[] }> {
    return apiCall<{ clientes: ClienteRentabilidade[] }>('rentabilidade/por-cliente');
  },

  async getGraficoMargem(): Promise<{ dados: GraficoMargemDado[] }> {
    return apiCall<{ dados: GraficoMargemDado[] }>('rentabilidade/grafico-margem');
  },

  async salvarCustosReais(data: {
    id: number;
    custo_material_real?: number;
    custo_mao_obra_real?: number;
    tempo_horas_real?: number;
    custo_retrabalho?: number;
    custo_desperdicio_material?: number;
    descricao_desvios?: string;
  }): Promise<{ success: boolean; data: any }> {
    return apiCall<{ success: boolean; data: any }>('rentabilidade/salvar', 'POST', data);
  }
};
