export type TipoColaborador = 'socio' | 'colaborador_fixo';
export type Vinculo = 'informal' | 'mei' | 'clt';
export type StatusPresenca =
  | 'presente'
  | 'falta'
  | 'falta_justificada'
  | 'meio_periodo'
  | 'ferias'
  | 'atestado';
export type StatusFolha = 'rascunho' | 'fechada' | 'paga';
export type StatusAdiantamento = 'pendente' | 'descontado' | 'cancelado';
export type TipoHE = '50' | '100';

export interface Colaborador {
  id: string;
  tenantId?: string;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  tipo: TipoColaborador;
  vinculo: Vinculo;
  cargo?: string | null;
  salarioBase: number;
  participacaoLucros: number;
  chavePix?: string | null;
  dataAdmissao?: string | null;
  ativo: boolean;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Presenca {
  id: string;
  tenantId?: string;
  colaboradorId: string;
  data: string;
  status: StatusPresenca;
  observacao?: string | null;
  horaSaida?: string | null; // HH:MM ex: '13:00'
  horaRetorno?: string | null; // HH:MM ex: '14:34'
  horasFaltaMinutos?: number; // calculado automático: horaRetorno - horaSaida em minutos (94 = 1h34)
  createdAt?: string;
}

export interface Adiantamento {
  id: string;
  tenantId?: string;
  colaboradorId: string;
  valor: number;
  data: string;
  competenciaDesconto: string; // '2026-09'
  formaPagamentoId?: string | null;
  observacao?: string | null;
  status: StatusAdiantamento;
  descontadoEmFolhaId?: string | null;
  createdAt?: string;
}

export interface FolhaPagamento {
  id: string;
  tenantId?: string;
  competencia: string;
  status: StatusFolha;
  totalBruto: number;
  totalDescontos: number;
  totalLiquido: number;
  totalHorasExtras: number;
  totalBonus: number;
  receitaMes: number;
  custosMes: number;
  lucroDistribuivel: number;
  fechadaEm?: string | null;
  fechadaPor?: string | null;
  createdAt?: string;
  updatedAt?: string;
  itens?: FolhaItem[];
}

export interface FolhaItem {
  id: string;
  folhaId: string;
  colaboradorId: string;
  colaboradorNome?: string;
  colaboradorTipo?: TipoColaborador;
  salarioBase: number;
  diasTrabalhados: number;
  faltasDias: number;
  valorFaltas: number;
  horasFaltaMinutos?: number; // total minutos falta parcial no mês (ex: 97 = 1h37)
  valorFaltaHoras?: number; // valor descontado por horas falta (minutos/60 * valorHora)
  horasExtrasQtd: number;
  horasExtrasTipo: TipoHE;
  horasExtrasPrevistas: number;
  valorHorasExtras: number;
  valorHorasExtrasPrevisto: number;
  bonusProducao: number;
  adiantamento: number;
  outrosDescontos: number;
  outrosDescricao?: string | null;
  valorLiquido: number;
  valorLiquidoPrevisto?: number | null;
  tituloPagarId?: string | null;
}

export interface LucroSocios {
  receitaMes: number;
  custosMes: number;
  totalFolha: number;
  lucroDistribuivel: number;
  porSocio: Array<{ colaboradorId: string; nome: string; participacao: number; valor: number }>;
}

export interface DashboardRH {
  competencia: string;
  custoTotalFolha: number;
  custoTotalPrevisto?: number;
  totalHorasExtras: number;
  totalHorasExtrasPrevisto?: number;
  totalAdiantamentos: number;
  lucroDistribuivel: number;
  receitaMes: number;
  custosMes: number;
  percentualFolhaReceita: number;
  historico6m: Array<{ competencia: string; totalLiquido: number; receitaMes?: number }>;
  porSocio?: LucroSocios['porSocio'];
}
