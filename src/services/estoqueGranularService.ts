import { apiCall } from '../lib/api.js';

export interface EstoqueGranularItem {
  sku_codigo: string;
  descricao: string;
  unidade_medida: string;
  quantidade_disponivel: number;
  quantidade_em_transito: number;
  quantidade_provisionado: number;
  quantidade_defeituoso: number;
  quantidade_vencido: number;
  quantidade_total: number;
  quantidade_minima: number;
  quantidade_maxima: number;
  preco_custo_unitario: number;
  valor_total_estoque: number;
  data_proxima_reposicao: string | null;
  status_alerta: 'ok' | 'alerta' | 'critica';
}

export interface AlertaEstoque {
  id: number;
  sku_codigo: string;
  tipo_alerta: 'minimo_atingido' | 'maximo_excedido' | 'em_falta' | 'vencimento_proximo' | 'muito_atrasado';
  quantidade_atual: number;
  limite_alerta: number;
  severidade: 'critica' | 'alerta' | 'aviso';
  data_alerta: string;
  descricao: string;
}

export interface ResultadoSKUMatch {
  sku_procurado: string;
  descricao_original: string;
  quantidade: number;
  skus_encontrados: Array<{
    sku_interno: string;
    nome: string;
    confianca: number;
    tipo_match: 'exato' | 'fuzzy' | 'descricao';
    quantidade_disponivel: number;
    preco_custo: number;
  }>;
  sku_selecionado: string;
  requer_validacao_manual: boolean;
}

export interface SKUMatchingLoteResult {
  success: boolean;
  total_itens: number;
  itens_com_match_exato: number;
  itens_requer_validacao: number;
  resultados: ResultadoSKUMatch[];
}

export const estoqueGranularService = {
  async getItems(filtro = 'todos', busca = ''): Promise<{ items: EstoqueGranularItem[] }> {
    const params = new URLSearchParams();
    if (filtro) params.append('filtro', filtro);
    if (busca) params.append('busca', busca);
    return apiCall<{ items: EstoqueGranularItem[] }>(`estoque/items?${params.toString()}`);
  },

  async getAlertas(): Promise<{ alertas: AlertaEstoque[] }> {
    return apiCall<{ alertas: AlertaEstoque[] }>('estoque/alertas');
  },

  async registrarMovimento(data: {
    sku_codigo: string;
    tipo_movimento: 'entrada_compra' | 'saida_producao' | 'devolucao' | 'descarte' | 'rejeicao_qc' | 'ajuste_entrada' | 'ajuste_saida';
    quantidade: number;
    status_alvo: 'disponivel' | 'em_transito' | 'provisionado' | 'defeituoso' | 'vencido';
    operacao_prod_id?: string;
    motivo?: string;
  }): Promise<{ success: boolean; saldo_novo: number; quantidade_total: number }> {
    return apiCall<{ success: boolean; saldo_novo: number; quantidade_total: number }>('estoque/registrar-movimento', 'POST', data);
  },

  async matchSKUsEmLote(quotation_id: string, itens_csv: Array<{
    sku_promob: string;
    descricao: string;
    quantidade: number;
  }>): Promise<SKUMatchingLoteResult> {
    return apiCall<SKUMatchingLoteResult>('orcamentos/sku-matching', 'POST', { quotation_id, itens_csv });
  }
};
