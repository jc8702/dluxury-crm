export interface Product {
  codigo: string;
  descricao: string;
  minSemBureau: number;
  minComBureau: number;
  midSemBureau: number;
  midComBureau: number;
  mg5SemBureau: number;
  mg5ComBureau: number;
  mg0SemBureau: number;
  mg0ComBureau: number;
  maxSemBureau: number;
  maxComBureau: number;
  sem_bureau: any;
  com_bureau: any;
}

export interface PaymentCondition {
  codigo: string;
  criterio: string;
  pct: number;
}

export interface SimulationInput {
  cliente_id: string;
  cliente_nome: string;
  produtos: any[];
  markup_desejado: number;
  aliquota_imposto: number;
  [key: string]: any;
}

export interface SimulationResult {
  total_custo: number;
  total_venda: number;
  margem_real: number;
  detalhes: any[];
  [key: string]: any;
}
