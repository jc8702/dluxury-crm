/**
 * Domain types for the Finance Module
 */

export type TipoContaInterna = 'conta_corrente' | 'poupanca' | 'caixa' | 'aplicacao';

export interface ContaInterna {
  id: string;
  nome: string;
  tipo: TipoContaInterna;
  banco_codigo?: string;
  agencia?: string;
  conta?: string;
  saldo_inicial: number;
  saldo_atual: number;
  data_criacao?: string;
}

export interface MovimentacaoExtrato {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  saldo_momento: number;
  tipo: 'entrada' | 'saida' | 'transferencia' | string;
  origem: string;
  conferido?: boolean;
}

export interface ExtratoPayload {
  conta: ContaInterna;
  saldo_inicial: number;
  extrato: MovimentacaoExtrato[];
}

export interface Fechamento {
  id: string;
  mes: number;
  ano: number;
  status: 'aberto' | 'fechado';
  data_fechamento: string;
  observacoes?: string;
}

export interface FormTransferencia {
  conta_origem_id: string;
  conta_destino_id: string;
  valor: string;
  data_movimento: string;
  descricao: string;
}

export interface Titulo {
  id: string;
  numero_titulo: string;
  cliente_id: string;
  valor_original: number;
  valor_aberto: number;
  data_vencimento: string;
  status: 'aberto' | 'pago' | 'cancelado';
  data_criacao: string;
  taxa_financeira?: number;
  valor_custo_financeiro?: number;
}

export interface BaixaTitulo {
  valor_baixa: number;
  valor_original_baixa: number;
  valor_multa: number;
  valor_juros: number;
  conta_interna_id: string;
  data_baixa: Date | string;
}

export interface ProximoVencimento {
  numero_titulo: string;
  data_vencimento: string;
  valor: number;
  tipo: 'pagar' | 'receber';
}

export interface Inadimplente {
  cliente_nome: string;
  total_vencido: number;
  dias_atraso: number;
}

export interface DespesaPorClasse {
  classe: string;
  total: number;
}

export interface KPIFinanceiro {
  a_pagar_30d: number;
  vencidos_total: number;
  capital_de_giro: number;
  a_receber_30d: number;
  proximos_vencimentos?: ProximoVencimento[];
  top5_inadimplentes?: Inadimplente[];
  despesas_por_classe?: DespesaPorClasse[];
  contas?: Array<{ nome: string; saldo_atual: number }>;
  saldo_total: number;
}

export interface CapitalGiroHistorico {
  label: string;
  capital: number;
}
