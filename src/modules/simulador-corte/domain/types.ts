export interface PecaSimulacao {
  id: string;
  nome: string;
  comprimento: number;
  largura: number;
  espessura: number;
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
  espacos_vazios?: { x: number; y: number; largura: number; altura: number }[];
}

export interface PlanoCorteCarregado {
  id: string;
  nome: string;
  materiais: any[];
  resultado: {
    perChapa?: Record<string, any>;
    totalAproveitamento?: number;
  } | null;
  created_at: string;
  updated_at: string;
}
