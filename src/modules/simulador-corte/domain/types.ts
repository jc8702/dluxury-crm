export interface PecaSimulacao {
  id: string;
  nome: string;
  largura: number;
  altura: number;
  x: number;
  y: number;
  rotacionada: boolean;
  cor?: string;
  sku?: string;
}

export interface ChapaSimulacao {
  sku: string;
  largura: number;
  altura: number;
  espessura: number;
}

export interface LayoutSimulacao {
  chapa: ChapaSimulacao;
  pecas: PecaSimulacao[];
  area_aproveitada_mm2: number;
  area_total_mm2: number;
  aproveitamento_percentual: number;
}

export interface PlanoCorteCarregado {
  id: string;
  nome: string;
  materiais: any[];
  resultado: {
    layouts: LayoutSimulacao[];
    pecas_rejeitadas: any[];
    area_total_pecas_mm2: number;
    area_total_chapas_mm2: number;
    aproveitamento_medio: number;
  } | null;
  created_at: string;
  updated_at: string;
}
