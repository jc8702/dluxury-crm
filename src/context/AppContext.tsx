import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import { apiService } from '../services/apiService';

// ─── TIPOS ────────────────────────────────────────────────

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

export type ProductionStep = 'corte' | 'furacao' | 'montagem' | 'pintura' | 'acabamento' | 'entrega';

export type Project = {
  id: string;
  clientId: string;
  clientName?: string; // denormalizado para exibição
  ambiente: string;
  descricao?: string;
  valorEstimado?: number;
  valorFinal?: number;
  prazoEntrega?: string;
  status: ProjectStatus;
  etapaProducao?: ProductionStep;
  responsavel?: string;
  observacoes?: string;
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

export type OrcamentoItem = {
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

export type Orcamento = {
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
  itens: OrcamentoItem[];
  criado_em?: string;
  atualizado_em?: string;
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

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
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
  fornecedor_principal?: string;
  observacoes?: string;
  ativo: boolean;
  updated_at?: string;
};

export type MovimentacaoEstoque = {
  id: string;
  material_id: string;
  material_nome?: string;
  material_sku?: string;
  material_unidade?: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  quantidade_uso: number;
  motivo?: string;
  projeto_id?: string;
  orcamento_id?: string;
  preco_unitario?: number;
  valor_total?: number;
  estoque_antes: number;
  estoque_depois: number;
  criado_por: string;
  criado_em: string;
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

// ─── CONTEXTO ─────────────────────────────────────────────

interface AppContextType {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;

  // Clients PF
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  removeClient: (id: string) => Promise<void>;

  // Projects
  projects: Project[];
  addProject: (project: Omit<Project, 'id'>) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  removeProject: (id: string) => Promise<void>;

  // Kanban (visits - legado adaptado)
  visits: KanbanItem[];
  updateKanbanStatus: (type: 'project' | 'visit', id: string, newStatus: string) => Promise<void>;
  addKanbanItem: (item: Omit<KanbanItem, 'id'>) => Promise<void>;
  updateKanbanItem: (id: string, data: Partial<KanbanItem>) => Promise<void>;

  // Estoque
  categorias: CategoriaMaterial[];
  materiais: Material[];
  movimentacoes: MovimentacaoEstoque[];
  fornecedores: Fornecedor[];
  addMaterial: (data: any) => Promise<void>;
  updateMaterial: (id: string, data: any) => Promise<void>;
  removeMaterial: (id: string) => Promise<void>;
  registrarMovimentacao: (data: any) => Promise<void>;
  addFornecedor: (data: any) => Promise<void>;
  updateFornecedor: (id: string, data: any) => Promise<void>;
  removeFornecedor: (id: string) => Promise<void>;

  // Billing
  billings: Billing[];
  addBilling: (billing: Omit<Billing, 'id'>) => Promise<void>;
  updateBilling: (id: string, billing: Partial<Billing>) => Promise<void>;
  removeBilling: (id: string) => Promise<void>;

  // Orcamentos
  orcamentos: Orcamento[];
  addOrcamento: (data: any) => Promise<void>;
  updateOrcamento: (id: string, data: any) => Promise<void>;
  removeOrcamento: (id: string) => Promise<void>;

  // Condicoes Pagamento
  condicoesPagamento: CondicaoPagamento[];
  addCondicaoPagamento: (data: any) => Promise<void>;
  updateCondicaoPagamento: (id: string, data: any) => Promise<void>;
  removeCondicaoPagamento: (id: string) => Promise<void>;

  // Goals
  monthlyGoals: Record<string, number>;
  setMonthlyGoal: (period: string, amount: number) => void;
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  currentMeta: number;
  metaMensal: number;
  setMetaMensal: (val: number) => void;

  // KPIs
  totalFaturadoMes: number;
  totalPeriodo: number;

  // Admin
  systemUsers: SystemUser[];
  loadSystemUsers: () => Promise<void>;

  // General
  reloadData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  // ─── STATE ─────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [visits, setVisits] = useState<KanbanItem[]>([]);
  const [categorias, setCategorias] = useState<CategoriaMaterial[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState<CondicaoPagamento[]>([]);

  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthlyGoals, setMonthlyGoals] = useState<Record<string, number>>({});

  // Admin
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);

  const loadSystemUsers = async () => {
    if (user?.role === 'admin') {
      const u = await apiService.getUsers().catch(() => []);
      setSystemUsers(u);
    }
  };

  // ─── AUTHENTICATION ────────────────────────────────────
  const logout = () => {
    import('../services/apiService').then(({ removeAuthToken }) => removeAuthToken());
    setUser(null);
  };

  // ─── GOALS ─────────────────────────────────────────────
  const setMonthlyGoal = async (period: string, amount: number) => {
    try {
      await apiService.updateMonthlyGoal(period, amount);
      setMonthlyGoals((prev: Record<string, number>) => ({ ...prev, [period]: amount }));
    } catch (error) {
      console.error('Erro ao salvar meta mensal:', error);
      setMonthlyGoals((prev: Record<string, number>) => ({ ...prev, [period]: amount }));
    }
  };

  const metaMensal = monthlyGoals[selectedPeriod] || 0;
  const setMetaMensal = (val: number) => setMonthlyGoal(selectedPeriod, val);

  // ─── DATA LOADING ──────────────────────────────────────
  const reloadData = useCallback(async () => {
    if (!user) return;
    try {
      await fetch('/api/init-db').catch(() => ({}));

      const [clientsData, billingsData, kanbanData, goalsData, catsData, matsData, fornsData, orcamentosData, condicoesData, movsData] = await Promise.all([
        apiService.getClients().catch(() => []),
        apiService.getBillings().catch(() => []),
        apiService.getKanbanItems().catch(() => []),
        apiService.getMonthlyGoals().catch(() => ({})),
        apiService.getCategorias().catch(() => []),
        apiService.getMateriais().catch(() => []),
        apiService.getFornecedores().catch(() => []),
        apiService.getOrcamentos().catch(() => []),
        apiService.getCondicoesPagamento().catch(() => []),
        apiService.getMovimentacoes().catch(() => [])
      ]);

      setCategorias(Array.isArray(catsData) ? catsData : []);
      setMateriais(Array.isArray(matsData) ? matsData.map((m: any) => ({
        ...m,
        fator_conversao: Number(m.fator_conversao || 1),
        estoque_atual: Number(m.estoque_atual || 0),
        estoque_minimo: Number(m.estoque_minimo || 0),
        preco_custo: Number(m.preco_custo || 0),
        preco_venda: m.preco_venda ? Number(m.preco_venda) : undefined,
        margem_lucro: m.margem_lucro ? Number(m.margem_lucro) : undefined,
        icms: m.icms ? Number(m.icms) : undefined,
        icms_st: m.icms_st ? Number(m.icms_st) : undefined,
        ipi: m.ipi ? Number(m.ipi) : undefined,
        pis: m.pis ? Number(m.pis) : undefined,
        cofins: m.cofins ? Number(m.cofins) : undefined,
        origem: m.origem ? Number(m.origem) : undefined
      })) : []);
      setFornecedores(Array.isArray(fornsData) ? fornsData : []);

      setOrcamentos(Array.isArray(orcamentosData) ? orcamentosData.map((o: any) => ({
        ...o,
        valor_base: Number(o.valor_base || 0),
        valor_final: Number(o.valor_final || 0),
        taxa_mensal: Number(o.taxa_mensal || 0),
        adicional_urgencia_pct: Number(o.adicional_urgencia_pct || 0)
      })) : []);

      setMovimentacoes(Array.isArray(movsData) ? movsData.map((m: any) => ({
        ...m,
        id: m.id.toString(),
        quantidade: Number(m.quantidade || 0),
        quantidade_uso: Number(m.quantidade_uso || 0),
        estoque_antes: Number(m.estoque_antes || 0),
        estoque_depois: Number(m.estoque_depois || 0),
        preco_unitario: Number(m.preco_unitario || 0),
        valor_total: Number(m.valor_total || 0)
      })) : []);

      setCondicoesPagamento(Array.isArray(condicoesData) ? condicoesData.map((c: any) => ({
        ...c,
        n_parcelas: Number(c.n_parcelas || 1)
      })) : []);

      // Goals
      setMonthlyGoals(Object.keys(goalsData).length > 0 ? goalsData : {});

      // Clients PF
      setClients(clientsData.map((c: any) => ({
        id: c.id?.toString() || Math.random().toString(),
        nome: c.nome || c.razao_social || c.razaoSocial || '',
        cpf: c.cpf || '',
        telefone: c.telefone || '',
        email: c.email || '',
        endereco: c.endereco || c.logradouro || '',
        bairro: c.bairro || '',
        cidade: c.cidade || c.municipio || '',
        uf: c.uf || '',
        tipoImovel: c.tipo_imovel || c.tipoImovel || '',
        comodosInteresse: c.comodos_interesse || c.comodosInteresse || [],
        origem: c.origem || '',
        observacoes: c.observacoes || c.historico || '',
        status: c.status || (c.situacao_cadastral === 'INATIVA' ? 'inativo' : 'ativo'),
        created_at: c.created_at,
      })));

      // Billings
      setBillings(billingsData.map((b: any) => ({
        ...b,
        id: b.id?.toString() || Math.random().toString(),
        descricao: b.descricao || b.nf || '',
        tipo: b.tipo || 'entrada',
        projectId: b.project_id || b.projectId,
        cliente: b.cliente || '',
        valor: Number(b.valor),
        categoria: b.categoria || 'outros',
        status: b.status || 'PAGO'
      })));

      // Kanban (visits)
      const kItems = kanbanData.map((k: any) => ({
        ...k,
        id: k.id?.toString() || Math.random().toString(),
        contactName: k.contact_name || k.contactName,
        contactRole: k.contact_role || k.contactRole,
        value: k.value ? Number(k.value) : undefined,
        visitDate: k.visit_date || k.visitDate,
        visitTime: k.visit_time || k.visitTime,
        visitType: k.visit_type || k.visitType,
        observations: k.observations,
        dateTime: k.date_time || k.dateTime,
        visitFormat: k.visit_format || k.visitFormat,
        description: k.description
      }));
      setVisits(kItems.filter((i: any) => (i.type || i.type_kanban) === 'visit'));

      // Projects (from kanban items of type 'project' for now — will migrate to projects table)
      const projectKanbans = kItems.filter((i: any) => (i.type || i.type_kanban) === 'project');
      setProjects(projectKanbans.map((p: any) => ({
        id: p.id?.toString(),
        clientId: '',
        clientName: p.subtitle || '',
        ambiente: p.title || '',
        descricao: p.description || p.observations || '',
        valorEstimado: p.value,
        status: mapLegacyStatus(p.status),
        observacoes: p.observations || '',
      })));

      // Removendo logs da carga principal pois System Health foi removido
    } catch (error) {
      console.error('Falha ao carregar dados do CRM:', error);
    }
  }, [user]);

  useEffect(() => {
    import('../services/apiService').then(async ({ apiService, hasAuthToken }) => {
      if (hasAuthToken()) {
        try {
          const res = await apiService.checkSession();
          setUser(res.user);
        } catch {
          import('../services/apiService').then(({ removeAuthToken }) => removeAuthToken());
          setUser(null);
        }
      }
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user && !authLoading) {
      reloadData();
    }
  }, [user, authLoading, reloadData]);

  // ─── HELPERS ───────────────────────────────────────────
  function mapLegacyStatus(status: string): ProjectStatus {
    const map: Record<string, ProjectStatus> = {
      'novo': 'lead',
      'analise': 'visita_tecnica',
      'proposta': 'orcamento_enviado',
      'negociacao': 'orcamento_enviado',
      'assinatura': 'aprovado',
      'ganho': 'concluido',
      // Direct mappings
      'lead': 'lead',
      'visita_tecnica': 'visita_tecnica',
      'orcamento_enviado': 'orcamento_enviado',
      'aprovado': 'aprovado',
      'em_producao': 'em_producao',
      'pronto_entrega': 'pronto_entrega',
      'instalado': 'instalado',
      'concluido': 'concluido',
    };
    return map[status] || 'lead';
  }


  // ─── CLIENT CRUD ───────────────────────────────────────
  const addClient = async (data: any) => {
    const saved = await apiService.addClient(data);
    const mapped: Client = {
      id: saved.id.toString(),
      nome: saved.nome || saved.razao_social || data.nome || '',
      cpf: saved.cpf || data.cpf || '',
      telefone: saved.telefone || data.telefone || '',
      email: saved.email || data.email || '',
      endereco: saved.endereco || data.endereco || '',
      bairro: saved.bairro || data.bairro || '',
      cidade: saved.cidade || data.cidade || '',
      uf: saved.uf || data.uf || '',
      tipoImovel: saved.tipo_imovel || data.tipoImovel,
      comodosInteresse: saved.comodos_interesse || data.comodosInteresse || [],
      origem: saved.origem || data.origem,
      observacoes: saved.observacoes || data.observacoes || '',
      status: saved.status || data.status || 'ativo',
    };
    setClients((prev: Client[]) => [...prev, mapped]);
  };

  const updateClient = async (id: string, data: any) => {
    const saved = await apiService.updateClient(id, data);
    setClients((prev: Client[]) => prev.map((c: Client) =>
      c.id === id ? {
        ...c,
        nome: saved.nome || data.nome || c.nome,
        cpf: saved.cpf || data.cpf || c.cpf,
        telefone: saved.telefone || data.telefone || c.telefone,
        email: saved.email || data.email || c.email,
        endereco: saved.endereco || data.endereco || c.endereco,
        bairro: saved.bairro || data.bairro || c.bairro,
        cidade: saved.cidade || data.cidade || c.cidade,
        uf: saved.uf || data.uf || c.uf,
        tipoImovel: saved.tipo_imovel || data.tipoImovel || c.tipoImovel,
        comodosInteresse: saved.comodos_interesse || data.comodosInteresse || c.comodosInteresse,
        origem: saved.origem || data.origem || c.origem,
        observacoes: saved.observacoes || data.observacoes || c.observacoes,
        status: saved.status || data.status || c.status,
      } : c
    ));
  };

  const removeClient = async (id: string) => {
    await apiService.removeClient(id);
    setClients((prev: Client[]) => prev.filter((c: Client) => c.id !== id));
  };

  // ─── PROJECT CRUD ──────────────────────────────────────
  const addProject = async (data: Omit<Project, 'id'>) => {
    // Use kanban endpoint for now (will migrate to projects table)
    const payload = {
      title: data.ambiente,
      subtitle: data.clientName || '',
      status: data.status || 'lead',
      type: 'project' as const,
      value: data.valorEstimado,
      observations: data.observacoes || data.descricao || '',
      description: data.descricao || '',
    };
    const saved = await apiService.addKanbanItem(payload);
    const mapped: Project = {
      id: saved.id.toString(),
      clientId: data.clientId,
      clientName: data.clientName,
      ambiente: data.ambiente,
      descricao: data.descricao,
      valorEstimado: data.valorEstimado,
      valorFinal: data.valorFinal,
      prazoEntrega: data.prazoEntrega,
      status: data.status || 'lead',
      etapaProducao: data.etapaProducao,
      responsavel: data.responsavel,
      observacoes: data.observacoes,
    };
    setProjects((prev: Project[]) => [...prev, mapped]);
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
    const payload: any = {};
    if (data.ambiente) payload.title = data.ambiente;
    if (data.clientName) payload.subtitle = data.clientName;
    if (data.status) payload.status = data.status;
    if (data.valorEstimado !== undefined) payload.value = data.valorEstimado;
    if (data.observacoes) payload.observations = data.observacoes;
    if (data.descricao) payload.description = data.descricao;

    await apiService.updateKanbanStatus(id, data.status || '', payload);
    setProjects((prev: Project[]) => prev.map((p: Project) =>
      p.id === id ? { ...p, ...data } : p
    ));
  };

  const removeProject = async (id: string) => {
    // Will need a delete endpoint — for now just remove from state
    setProjects((prev: Project[]) => prev.filter((p: Project) => p.id !== id));
  };

  // ─── BILLING CRUD ──────────────────────────────────────
  const addBilling = async (data: any) => {
    const saved = await apiService.addBilling(data);
    setBillings((prev: Billing[]) => [{
      ...saved,
      id: saved.id.toString(),
      descricao: saved.descricao || data.descricao || '',
      tipo: saved.tipo || data.tipo || 'entrada',
      projectId: saved.project_id || saved.projectId || data.projectId,
      cliente: saved.cliente || data.cliente || '',
      valor: Number(saved.valor),
      categoria: saved.categoria || data.categoria || 'outros',
      status: saved.status || 'PAGO'
    }, ...prev]);
  };

  const updateBilling = async (id: string, data: any) => {
    const saved = await apiService.updateBilling(id, data);
    setBillings((prev: Billing[]) => prev.map((b: Billing) =>
      b.id === id ? {
        ...saved,
        id: saved.id.toString(),
        descricao: saved.descricao || data.descricao || b.descricao,
        tipo: saved.tipo || data.tipo || b.tipo,
        projectId: saved.project_id || saved.projectId || data.projectId || b.projectId,
        cliente: saved.cliente || data.cliente || b.cliente || '',
        valor: Number(saved.valor),
        categoria: saved.categoria || data.categoria || b.categoria,
        status: saved.status || data.status || b.status
      } : b
    ));
  };

  const removeBilling = async (id: string) => {
    await apiService.removeBilling(id);
    setBillings((prev: Billing[]) => prev.filter((b: Billing) => b.id !== id));
  };

  // ─── KANBAN (visits) ──────────────────────────────────
  const updateKanbanStatus = async (_type: any, id: string, newStatus: string) => {
    await apiService.updateKanbanStatus(id, newStatus);
    setVisits((prev: KanbanItem[]) => prev.map((i: KanbanItem) =>
      i.id === id ? { ...i, status: newStatus } : i
    ));
  };

  const addKanbanItem = async (data: any) => {
    const payload = {
      ...data,
      contact_name: data.contactName,
      contact_role: data.contactRole,
      visit_date: data.visitDate,
      visit_time: data.visitTime,
      visit_type: data.visitType,
      value: data.value,
      email: data.email,
      phone: data.phone,
      city: data.city,
      state: data.state,
      temperature: data.temperature,
      observations: data.observations || data.description
    };
    const saved = await apiService.addKanbanItem(payload);
    const mapped = {
      ...saved,
      id: saved.id.toString(),
      contactName: saved.contact_name,
      contactRole: saved.contact_role,
      value: saved.value ? Number(saved.value) : undefined,
      visitDate: saved.visit_date,
      visitTime: saved.visit_time,
      visitType: saved.visit_type,
      observations: saved.observations,
      dateTime: saved.date_time,
      visitFormat: saved.visit_format,
      description: saved.description
    };
    if (data.type === 'visit') {
      setVisits((prev: KanbanItem[]) => [...prev, mapped]);
    }
  };

  const updateKanbanItem = async (id: string, data: Partial<KanbanItem>) => {
    const payload = {
      ...data,
      contact_name: data.contactName,
      contact_role: data.contactRole,
      visit_date: data.visitDate,
      visit_time: data.visitTime,
      visit_type: data.visitType,
      date_time: data.dateTime,
      visit_format: data.visitFormat,
      description: data.description || data.observations
    };
    await apiService.updateKanbanStatus(id, data.status!, payload);
    setVisits((prev: KanbanItem[]) => prev.map((i: KanbanItem) =>
      i.id === id ? { ...i, ...data } : i
    ));
  };

  // ─── ESTOQUE CRUD ─────────────────────────────────────
  const addMaterial = async (data: any) => {
    const saved = await apiService.addMaterial(data);
    setMateriais(prev => [...prev, {
      ...saved,
      fator_conversao: Number(saved.fator_conversao),
      estoque_atual: Number(saved.estoque_atual),
      estoque_minimo: Number(saved.estoque_minimo),
      preco_custo: Number(saved.preco_custo)
    }]);
  };

  const updateMaterial = async (id: string, data: any) => {
    const saved = await apiService.updateMaterial(id, data);
    setMateriais(prev => prev.map(m => m.id === id ? {
      ...saved,
      fator_conversao: Number(saved.fator_conversao),
      estoque_atual: Number(saved.estoque_atual),
      estoque_minimo: Number(saved.estoque_minimo),
      preco_custo: Number(saved.preco_custo)
    } : m));
  };

  const removeMaterial = async (id: string) => {
    await apiService.removeMaterial(id);
    setMateriais(prev => prev.filter(m => m.id !== id));
  };

  const registrarMovimentacao = async (data: any) => {
    const savedMov = await apiService.registrarMovimentacao(data);
    // Após movimentação, recarregamos materiais para garantir saldo atualizado
    const mats = await apiService.getMateriais();
    setMateriais(mats.map((m: any) => ({
      ...m,
      fator_conversao: Number(m.fator_conversao),
      estoque_atual: Number(m.estoque_atual),
      estoque_minimo: Number(m.estoque_minimo),
      preco_custo: Number(m.preco_custo)
    })));
    return savedMov;
  };

  // ─── FORNECEDORES CRUD ─────────────────────────────────
  const addFornecedor = async (data: any) => {
    const saved = await apiService.addFornecedor(data);
    setFornecedores(prev => [...prev, saved]);
  };

  const updateFornecedor = async (id: string, data: any) => {
    const saved = await apiService.updateFornecedor(id, data);
    setFornecedores(prev => prev.map(f => f.id === id ? saved : f));
  };

  const removeFornecedor = async (id: string) => {
    await apiService.removeFornecedor(id);
    setFornecedores(prev => prev.filter(f => f.id !== id));
  };

  // ─── ORCAMENTO CRUD ────────────────────────────────────
  const addOrcamento = async (data: any) => {
    const saved = await apiService.addOrcamento(data);
    setOrcamentos(prev => [saved, ...prev]);
  };

  const updateOrcamento = async (id: string, data: any) => {
    const saved = await apiService.updateOrcamento(id, data);
    setOrcamentos(prev => prev.map(o => o.id === id ? saved : o));
  };

  const removeOrcamento = async (id: string) => {
    await apiService.removeOrcamento(id);
    setOrcamentos(prev => prev.filter(o => o.id !== id));
  };

  // ─── CONDICAO PAGAMENTO CRUD ────────────────────────────
  const addCondicaoPagamento = async (data: any) => {
    const saved = await apiService.addCondicaoPagamento(data);
    setCondicoesPagamento(prev => [...prev, saved]);
  };

  const updateCondicaoPagamento = async (id: string, data: any) => {
    const saved = await apiService.updateCondicaoPagamento(id, data);
    setCondicoesPagamento(prev => prev.map(c => c.id === id ? saved : c));
  };

  const removeCondicaoPagamento = async (id: string) => {
    await apiService.removeCondicaoPagamento(id);
    setCondicoesPagamento(prev => prev.filter(c => c.id !== id));
  };

  // ─── KPIs ──────────────────────────────────────────────
  const currentMeta = useMemo(() => {
    if (selectedPeriod === 'Annual') {
      return Object.values(monthlyGoals).reduce((acc: number, curr: number) => acc + curr, 0);
    }
    return monthlyGoals[selectedPeriod] || 0;
  }, [selectedPeriod, monthlyGoals]);

  const totalPeriodo = useMemo(() => {
    const paid = billings.filter((b: Billing) => b.status === 'PAGO' && b.tipo === 'entrada');
    if (selectedPeriod === 'Annual') {
      const currentYear = new Date().getFullYear().toString();
      return paid
        .filter((b: Billing) => b.data.startsWith(currentYear))
        .reduce((acc: number, curr: Billing) => acc + curr.valor, 0);
    }
    return paid
      .filter((b: Billing) => b.data.startsWith(selectedPeriod))
      .reduce((acc: number, curr: Billing) => acc + curr.valor, 0);
  }, [billings, selectedPeriod]);

  const totalFaturadoMes = totalPeriodo;

  // ─── PROVIDER ──────────────────────────────────────────
  if (authLoading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', color: 'var(--primary)' }}>Carregando sessão...</div>;
  }

  return (
    <AppContext.Provider value={{
      user, setUser, logout,
      clients, addClient, updateClient, removeClient,
      projects, addProject, updateProject, removeProject,
      visits, updateKanbanStatus, addKanbanItem, updateKanbanItem,
      categorias, materiais, movimentacoes, fornecedores, addMaterial, updateMaterial, removeMaterial, registrarMovimentacao,
      addFornecedor, updateFornecedor, removeFornecedor,
      billings, addBilling, updateBilling, removeBilling,
      orcamentos, addOrcamento, updateOrcamento, removeOrcamento,
      condicoesPagamento, addCondicaoPagamento, updateCondicaoPagamento, removeCondicaoPagamento,
      monthlyGoals, setMonthlyGoal, selectedPeriod, setSelectedPeriod,
      currentMeta, metaMensal, setMetaMensal,
      totalFaturadoMes, totalPeriodo,
      systemUsers, loadSystemUsers,
      reloadData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
