export interface Peca {
  id: string;
  nome: string;
  largura_mm: number;
  altura_mm: number;
  quantidade: number;
  rotacionavel?: boolean;
  fio_de_fita?: {
    topo: boolean;
    baixo: boolean;
    esquerda: boolean;
    direita: boolean;
  };
}

export interface ChapaMaterial {
  sku: string;
  largura_mm: number;
  altura_mm: number;
  espessura_mm?: number;
  pecas: Peca[];
}

export interface PecaPosicionada {
  peca_id: string;
  nome: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  rotacionada: boolean;
  fio_de_fita?: any;
}

export interface LayoutChapa {
  chapa_sku: string;
  indice_chapa: number;
  largura_original_mm?: number;
  altura_original_mm?: number;
  pecas_posicionadas: PecaPosicionada[];
  area_aproveitada_mm2: number;
  area_desperdicada_mm2: number;
}

export interface ResultadoOtimizacao {
  chapas_necessarias: number;
  aproveitamento_percentual: number;
  layouts: LayoutChapa[];
  tempo_calculo_ms: number;
}
