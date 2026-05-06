/**
 * TIPOS TÉCNICOS — MÓDULO PLANO DE CORTE
 * Enterprise-grade Type Definitions
 */

export interface FioDeFita {
  topo?: boolean;
  baixo?: boolean;
  esquerda?: boolean;
  direita?: boolean;
}

export interface Peca {
  id: string;
  nome: string;
  largura: number; // mm
  altura: number;  // mm
  rotacionavel: boolean;
  fio_de_fita?: FioDeFita;
  quantidade?: number;
  material?: string;
  sku_chapa?: string;
  observacoes?: string;
  metadata?: Record<string, any>;
}

export interface PecaPosicionada extends Peca {
  x: number;
  y: number;
  rotacionada: boolean;
}

export interface Retangulo {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface LayoutChapa {
  tipo: 'retalho' | 'chapa_inteira';
  chapa_sku: string;
  retalho_id?: string;
  indice_chapa?: number;
  largura_original_mm: number;
  altura_original_mm: number;
  pecas_posicionadas: PecaPosicionada[];
  espacos_livres?: Retangulo[];
  area_aproveitada_mm2: number;
  area_total_mm2: number;
  aproveitamento_percentual: number;
}

export interface ResultadoOtimizacao {
  layouts: LayoutChapa[];
  pecas_rejeitadas: Peca[];
  retalhos_utilizados: number;
  chapas_novas_utilizadas: number;
  area_total_pecas_mm2: number;
  area_total_chapas_mm2: number;
  aproveitamento_medio: number;
  economia_retalhos_mm2: number;
  tempo_calculo_ms: number;
}

export interface FiltrosRetalho {
  sku_chapa?: string;
  largura_min?: number;
  altura_min?: number;
  area_min?: number;
  disponivel?: boolean;
  descartado?: boolean;
  origem?: string;
}
