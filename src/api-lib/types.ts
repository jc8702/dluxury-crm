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
  atualizado_em?: string;
}

export interface Orcamento {
  id: string;
  cliente_id: string;
  projeto_id?: string;
  numero: string;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'em_producao' | 'concluido';
  valor_base: number;
  taxa_mensal: number;
  condicao_pagamento_id?: string;
  valor_final: number;
  prazo_entrega_dias?: number;
  prazo_tipo?: string;
  adicional_urgencia_pct?: number;
  observacoes?: string;
  materiais_consumidos?: any;
  criado_em?: string;
  atualizado_em?: string;
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
