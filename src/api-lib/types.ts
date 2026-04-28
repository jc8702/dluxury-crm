export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export interface Client {
  id: string;
  nome: string;
  cpf?: string;
  telefone: string;
  email?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  tipo_imovel?: string;
  comodos_interesse?: string;
  origem?: string;
  observacoes?: string;
  status: string;
  created_at?: string;
  razao_social?: string;
  cnpj?: string;
  municipio?: string;
  situacao_cadastral?: string;
}

export interface Billing {
  id: string;
  description: string;
  amount: number;
  type: 'entrada' | 'saida';
  due_date: string;
  status: 'pending' | 'paid' | 'cancelled';
  category: string;
  created_at?: string;
}

export interface ClasseFinanceira {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'sintetica' | 'analitica';
  natureza: 'credora' | 'devedora';
  pai_id?: string;
  ativa: boolean;
  dt_limite?: string;
  permite_lancamento: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ContaInterna {
  id: string;
  nome: string;
  tipo: string;
  banco_codigo?: string;
  agencia?: string;
  conta?: string;
  saldo_inicial: number;
  saldo_atual: number;
  data_saldo_inicial?: string;
  ativa: boolean;
  created_at?: string;
}

export interface TituloReceber {
  id: string;
  numero_titulo: string;
  cliente_id: string;
  projeto_id?: string;
  orcamento_id?: string;
  valor_original: number;
  valor_liquido: number;
  valor_juros: number;
  valor_multa: number;
  valor_desconto: number;
  valor_aberto: number;
  data_emissao: string;
  data_vencimento: string;
  data_competencia: string;
  data_pagamento?: string;
  classe_financeira_id: string;
  centro_custo_id?: string;
  forma_recebimento_id: string;
  status: string;
  parcela: number;
  total_parcelas: number;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TituloPagar {
  id: string;
  numero_titulo: string;
  fornecedor_id: string;
  nota_fiscal?: string;
  pedido_compra_id?: string;
  valor_original: number;
  valor_liquido: number;
  valor_juros: number;
  valor_multa: number;
  valor_desconto: number;
  valor_aberto: number;
  data_emissao: string;
  data_vencimento: string;
  data_competencia: string;
  data_pagamento?: string;
  classe_financeira_id: string;
  centro_custo_id?: string;
  forma_pagamento_id: string;
  conta_bancaria_id: string;
  status: string;
  parcela: number;
  total_parcelas: number;
  tipo_despesa?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}


export interface Material {
  id: string;
  sku: string;
  nome: string;
  descricao?: string;
  categoria_id: string;
  subcategoria?: string;
  unidade_compra: string;
  unidade_uso: string;
  fator_conversao: number;
  estoque_atual: number;
  estoque_minimo: number;
  preco_custo: number;
  fornecedor_principal?: string;
  observacoes?: string;
  ativo: boolean;
  updated_at?: string;
}

export interface Orcamento {
  id: string;
  cliente_id: string;
  projeto_id?: string;
  numero: string;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'em_producao' | 'concluido' | 'revisao_solicitada';
  valor_base: number;
  taxa_mensal: number;
  condicao_pagamento_id?: string;
  valor_final: number;
  prazo_entrega_dias?: number;
  prazo_tipo?: string;
  adicional_urgencia_pct?: number;
  observacoes?: string;
  materiais_consumidos?: any;
  token_aprovacao?: string;
  url_aprovacao?: string;
  aprovado_em?: string;
  aprovado_ip?: string;
  aprovado_nome?: string;
  recusado_em?: string;
  motivo_recusa?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  client_id?: string;
  client_name: string;
  ambiente: string;
  descricao: string;
  valor_estimado: number;
  valor_final: number;
  prazo_entrega?: string;
  status: 'lead' | 'briefing' | 'measure' | 'design' | 'budget' | 'contract' | 'production' | 'installation' | 'concluded';
  etapa_producao?: string;
  responsavel?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface KanbanItem {
  id: string;
  title: string;
  subtitle: string;
  label: string;
  status: string;
  type: string;
  contact_name?: string;
  contact_role?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  value?: number;
  temperature?: 'cold' | 'warm' | 'hot';
  visit_date?: string;
  visit_time?: string;
  visit_type?: string;
  observations?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ERPCategory {
  id: string; // Ex: 'CHP'
  nome: string;
  ativo: boolean;
}

export interface ERPFamily {
  id: string; // UUID
  nome: string;
  categoria_id: string;
  ativo: boolean;
}

export interface ERPSubfamily {
  id: string; // UUID
  nome: string;
  familia_id: string;
  ativo: boolean;
}

export interface PedidoCompra {
  id: string;
  numero: string;
  fornecedor_id: string;
  status: 'rascunho' | 'enviado' | 'confirmado' | 'parcialmente_recebido' | 'recebido' | 'cancelado';
  data_pedido: string;
  data_previsao_entrega?: string;
  data_recebimento?: string;
  valor_total: number;
  frete: number;
  observacoes?: string;
  origem: 'manual' | 'sugestao_estoque';
  created_at?: string;
  updated_at?: string;
}

export interface ItemPedidoCompra {
  id: string;
  pedido_id: string;
  material_id: string;
  sku: string;
  descricao: string;
  quantidade_pedida: number;
  quantidade_recebida: number;
  unidade: string;
  preco_unitario: number;
  subtotal: number;
  status_item: 'pendente' | 'parcial' | 'recebido';
}

export interface RecebimentoCompra {
  id: string;
  pedido_id: string;
  item_id: string;
  quantidade_recebida: number;
  data_recebimento: string;
  nota_fiscal?: string;
  observacao?: string;
}

export interface EventoAgenda {
  id: string;
  titulo: string;
  tipo: 'visita_comercial' | 'medicao' | 'entrega' | 'instalacao' | 'garantia' | 'reuniao' | 'outro';
  data_inicio: string;
  data_fim?: string;
  dia_inteiro: boolean;
  cliente_id?: string;
  projeto_id?: string;
  visita_id?: string;
  chamado_id?: string;
  responsavel: string;
  local?: string;
  observacoes?: string;
  status: 'agendado' | 'confirmado' | 'realizado' | 'cancelado';
  cor?: string;
  created_at?: string;
}

export interface Notificacao {
  id: string;
  tipo: 'estoque_critico' | 'prazo_projeto' | 'orcamento_sem_resposta' | 'garantia_pendente' | 'compra_atrasada' | 'meta_mensal';
  titulo: string;
  mensagem: string;
  prioridade: 'info' | 'normal' | 'alta' | 'critica';
  lida: boolean;
  data_leitura?: string;
  referencia_tipo?: 'orcamento' | 'projeto' | 'material' | 'chamado';
  referencia_id?: string;
  url_destino?: string;
  created_at?: string;
}
