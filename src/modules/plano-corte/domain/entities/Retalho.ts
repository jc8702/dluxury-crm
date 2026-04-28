export interface Retalho {
  id: string;
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  sku_chapa: string;
  origem: 'sobra_plano_corte' | 'devolucao' | 'manual' | 'ajuste';
  plano_corte_origem_id?: string;
  projeto_origem?: string;
  observacoes?: string;
  disponivel: boolean;
  utilizado_em_id?: string;
  data_utilizacao?: Date;
  descartado: boolean;
  motivo_descarte?: string;
  data_descarte?: Date;
  localizacao?: string;
  criado_em: Date;
  atualizado_em: Date;
  usuario_criou?: string;
  usuario_atualizou?: string;
  metadata?: Record<string, any>;
}

export interface RetalhoDisponivel extends Retalho {
  area_mm2: number;
  dias_estoque: number;
}

export interface CriarRetalhoInput {
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  sku_chapa: string;
  origem: 'sobra_plano_corte' | 'devolucao' | 'manual' | 'ajuste';
  plano_corte_origem_id?: string;
  projeto_origem?: string;
  observacoes?: string;
  localizacao?: string;
  usuario_criou?: string;
}

export interface FiltrosRetalho {
  sku_chapa?: string;
  largura_min?: number;
  altura_min?: number;
  area_min?: number;
  origem?: string;
  disponivel?: boolean;
  descartado?: boolean;
}
