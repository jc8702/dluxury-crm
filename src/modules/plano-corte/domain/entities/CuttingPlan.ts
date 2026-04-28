import { Peca } from "../services/MaxRectsOptimizer";

export interface PecaPosicionada extends Peca {
  x: number;
  y: number;
  rotacionada: boolean;
  fio_de_fita?: {
    topo?: boolean;
    baixo?: boolean;
    esquerda?: boolean;
    direita?: boolean;
  };
}

export interface LayoutChapa {
  tipo: 'retalho' | 'chapa_inteira';
  chapa_sku: string;
  retalho_id?: string;
  indice_chapa?: number;
  largura_original_mm: number;
  altura_original_mm: number;
  pecas_posicionadas: PecaPosicionada[];
  area_aproveitada_mm2: number;
  area_desperdicada_mm2: number;
}

export interface ResultadoOtimizacao {
  layouts: LayoutChapa[];
  retalhos_utilizados: number;
  chapas_novas_utilizadas: number;
  aproveitamento_percentual: number;
  economia_retalhos_mm2: number;
  tempo_calculo_ms: number;
}
