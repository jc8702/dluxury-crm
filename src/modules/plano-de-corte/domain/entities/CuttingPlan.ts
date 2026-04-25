export interface ChapaMaterial {
  id: string;
  sku: string;           // ex: "CHP-MDF-18MM"
  nome: string;          // ex: "MDF 18mm Branco"
  tipo_material?: string;
  cor?: string;
  altura_mm: number;     // ex: 1830
  largura_mm: number;    // ex: 2750
  espessura_mm: number;  // ex: 18
  preco_unitario?: number;
  pecas: PecaCorte[];
}

export interface PecaCorte {
  id: string;
  nome: string;          // ex: "Lateral Gaveta"
  largura_mm: number;
  altura_mm: number;
  quantidade: number;
  fio_de_fita?: {
    topo: boolean;
    baixo: boolean;
    esquerda: boolean;
    direita: boolean;
  };
  sku_engenharia_origem?: string;
  rotacionavel?: boolean;
}

export interface PlanoDeCorte {
  id?: string;
  sku_engenharia?: string;
  nome_plano: string;
  kerf_mm: number;           // espessura de serra, padrão 3mm
  materiais: ChapaMaterial[];
  resultado?: ResultadoOtimizacao;
  criado_em?: string;
  atualizado_em?: string;
}

export interface ResultadoOtimizacao {
  chapas_necessarias: number;
  aproveitamento_percentual: number;
  layouts: LayoutChapa[];
  tempo_calculo_ms: number;
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

export interface PecaPosicionada {
  peca_id: string;
  nome: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  rotacionada: boolean;
  fio_de_fita?: {
    topo: boolean;
    baixo: boolean;
    esquerda: boolean;
    direita: boolean;
  };
}
