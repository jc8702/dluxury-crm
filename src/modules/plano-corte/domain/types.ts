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
  sku?: string; // Código único da peça (opcional)
  nome: string; // Descrição/Nome (Catalog)
  identificador?: string; // Nome Customizado (User)
  largura: number; // mm
  altura: number;  // mm
  rotacionavel: boolean;
  fio_de_fita?: FioDeFita;
  quantidade?: number;
  material?: string;
  sku_chapa?: string;
  identificador_projeto?: string;
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

export interface ChapaSelecionada {
  id: string;
  sku_chapa: string;
  nome_exibicao: string; // "MDF Branco 18mm"
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  preco_unitario: number;
  imagem_url?: string;
  criada_em: Date;
  pecas: Peca[]; // Peças vinculadas a esta chapa específica
}

export interface ProjetoCorte {
  id: string;
  nome: string; // Nome do projeto/cliente
  cliente?: string;
  chapas: ChapaSelecionada[]; // Lista de materiais/abas no projeto
  status: 'rascunho' | 'aprovado' | 'producao';
  originario_pdf?: boolean;
  criado_em: Date;
}

export interface ResultadoOtimizacaoPorChapa {
  chapa_id: string;
  layouts: LayoutChapa[];
  aproveitamento_percentual: number;
  chapas_necessarias: number;
  tempo_calculo_ms: number;
  retalhos_utilizados: number;
}
