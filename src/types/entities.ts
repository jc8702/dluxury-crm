export type Client = {
  id: string;
  nome: string;
  cpf?: string;
  telefone: string;
  email?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  tipoImovel?: 'casa' | 'apartamento' | 'comercial';
  comodosInteresse?: string[];
  origem?: 'indicacao' | 'instagram' | 'google' | 'feira' | 'passante' | 'outro';
  observacoes?: string;
  status?: 'ativo' | 'inativo';
  created_at?: string;
};

export type ProjectStatus =
  | 'lead'
  | 'visita_tecnica'
  | 'orcamento_enviado'
  | 'aprovado'
  | 'em_producao'
  | 'pronto_entrega'
  | 'instalado'
  | 'concluido';

export type ProductionStep =
  | 'corte'
  | 'furacao'
  | 'montagem'
  | 'pintura'
  | 'acabamento'
  | 'entrega';

export type Project = {
  id: string;
  clientId: string;
  clientName?: string;
  ambiente: string;
  descricao?: string;
  valorEstimado?: number;
  valorFinal?: number;
  prazoEntrega?: string;
  status: ProjectStatus;
  etapaProducao?: ProductionStep;
  responsavel?: string;
  observacoes?: string;
  tag?: string;
  visitaId?: string;
  orcamentoId?: string;
  ordem_producao_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Billing = {
  id: string;
  projectId?: string;
  cliente?: string;
  descricao: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  data: string;
  categoria?: 'sinal' | 'parcela' | 'final' | 'material' | 'mo_terceirizada' | 'outros';
  status: 'PAGO' | 'PENDENTE' | 'CANCELADO';
};

export type QuotationItem = {
  id?: string;
  descricao: string;
  ambiente: string;
  largura_cm: number;
  altura_cm: number;
  profundidade_cm: number;
  material: string;
  acabamento: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  cfop?: string;
  ncm?: string;
  icms?: number;
  icms_st?: number;
  ipi?: number;
  pis?: number;
  cofins?: number;
  origem?: number;
};

export type Quotation = {
  id: string;
  cliente_id: string;
  cliente_nome?: string;
  projeto_id?: string;
  numero: string;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'em_producao';
  valor_base: number;
  taxa_mensal: number;
  condicao_pagamento_id: string;
  valor_final: number;
  prazo_entrega_dias: number;
  prazo_tipo: 'padrao' | 'urgente';
  adicional_urgencia_pct: number;
  observacoes?: string;
  materiais_consumidos?: { material_id: string; quantidade: number }[];
  itens: QuotationItem[];
  created_at?: string;
  updated_at?: string;
};

export type CondicaoPagamento = {
  id: string;
  nome: string;
  n_parcelas: number;
  ativo: boolean;
};

export type KanbanItem = {
  id: string;
  title: string;
  subtitle?: string;
  label?: string;
  status: string;
  type: 'project' | 'visit';
  contactName?: string;
  contactRole?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  value?: number;
  temperature?: string;
  visitDate?: string;
  visitTime?: string;
  visitType?: string;
  observations?: string;
  dateTime?: string;
  visitFormat?: 'Presencial' | 'Online';
  description?: string;
};

export type Role = 'admin' | 'vendedor' | 'marceneiro';

export type PlanTier = 'free' | 'pro' | 'enterprise';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId?: string;
  planoTier?: PlanTier;
  subdominio?: string;
};

export type CategoriaMaterial = {
  id: string;
  nome: string;
  slug: string;
  icone: string;
};

export type Material = {
  id: string;
  sku: string;
  nome: string;
  descricao?: string;
  categoria_id: string;
  categoria_nome?: string;
  categoria_icone?: string;
  subcategoria?: string;
  unidade_compra: string;
  unidade_uso: string;
  fator_conversao: number;
  estoque_atual: number;
  estoque_minimo: number;
  preco_custo: number;
  preco_venda?: number;
  margem_lucro?: number;
  cfop?: string;
  ncm?: string;
  icms?: number;
  icms_st?: number;
  ipi?: number;
  pis?: number;
  cofins?: number;
  origem?: number;
  largura_mm?: number;
  altura_mm?: number;
  marca?: string;
  fornecedor_principal?: string;
  observacoes?: string;
  ativo: boolean;
  updated_at?: string;
};

// ─── COMPOSIÇÃO TÉCNICA ──────────────────────────────────
export type OrcamentoAmbiente = {
  id: string;
  quotation_id: string;
  nome: string;
  ordem: number;
  moveis?: OrcamentoMovel[];
};

export type OrcamentoMovel = {
  id: string;
  ambiente_id: string;
  nome: string;
  tipo_movel:
    | 'armario'
    | 'gaveteiro'
    | 'painel'
    | 'balcao'
    | 'estante'
    | 'bancada'
    | 'nicho'
    | 'outro';
  largura_total_cm: number;
  altura_total_cm: number;
  profundidade_total_cm: number;
  observacoes?: string;
  ordem: number;
  pecas?: OrcamentoPeca[];
  ferragens?: OrcamentoFerragem[];
};

export type OrcamentoPeca = {
  id: string;
  movel_id: string;
  material_id: string;
  sku: string;
  descricao_peca: string;
  largura_cm: number;
  altura_cm: number;
  quantidade: number;
  m2_unitario: number;
  m2_total: number;
  fator_perda_pct: number;
  m2_com_perda: number;
  preco_custo_m2: number;
  custo_total_peca: number;
  metros_fita_borda: number;
  fita_material_id?: string;
};

export type OrcamentoFerragem = {
  id: string;
  movel_id: string;
  material_id: string;
  sku: string;
  descricao?: string;
  quantidade: number;
  unidade: string;
  preco_custo_unitario: number;
  custo_total: number;
};

export type OrcamentoCustoExtra = {
  id: string;
  quotation_id: string;
  descricao: string;
  tipo: 'mao_de_obra_producao' | 'mao_de_obra_instalacao' | 'frete' | 'projeto' | 'outro';
  forma_calculo: 'valor_fixo' | 'percentual_material' | 'por_m2';
  percentual_ou_valor: number;
  m2_total_referencia?: number;
  valor_calculado: number;
};

export type ConfiguracaoPrecificacao = {
  id: string;
  fator_perda_padrao: number;
  markup_padrao: number;
  aliquota_imposto: number;
  mo_producao_pct_padrao: number;
  mo_instalacao_pct_padrao: number;
  margem_minima_alerta: number;
};

export type MovimentacaoEstoque = {
  id: string;
  material_id: string;
  material_nome?: string;
  material_sku?: string;
  material_unidade?: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  motivo?: string;
  projeto_id?: string;
  quotation_id?: string;
  preco_unitario?: number;
  valor_total?: number;
  estoque_antes: number;
  estoque_depois: number;
  criado_por: string;
  created_at: string;
  nota_fiscal?: string;
};

export type Fornecedor = {
  id: string;
  nome: string;
  cnpj?: string;
  contato?: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  ativo: boolean;
};

export type SystemUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
};
