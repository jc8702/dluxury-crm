export interface Peca {
  id: string;
  nome: string;
  largura: number;
  altura: number;
  rotacionavel: boolean;
  fio_de_fita?: {
    topo: boolean;
    baixo: boolean;
    esquerda: boolean;
    direita: boolean;
  };
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

export interface FreeRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Sobra {
  x: number;
  y: number;
  largura: number;
  altura: number;
  aproveitavel: boolean;
}

export interface ResultadoOtimizacao {
  chapa_id?: string;
  grupo_id?: string;
  is_retalho?: boolean;
  largura_chapa: number;
  altura_chapa: number;
  pecas_posicionadas: PecaPosicionada[];
  espacos_livres: FreeRectangle[];
  sobras: Sobra[];
  aproveitamento: number;
  area_usada: number;
  area_total: number;
  algoritmo_usado?: string;
  tempo_ms?: number;
}
