import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { apiService, hasAppPin } from '../services/apiService';

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
  descricao: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  data: string;
  categoria?: 'sinal' | 'parcela' | 'final' | 'material' | 'mo_terceirizada' | 'outros';
  status: 'PAGO' | 'PENDENTE' | 'CANCELADO';
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

export type SystemLog = {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
};

// ─── CONTEXTO ─────────────────────────────────────────────

interface AppContextType {
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

  // Billing
  billings: Billing[];
  addBilling: (billing: Omit<Billing, 'id'>) => Promise<void>;
  updateBilling: (id: string, billing: Partial<Billing>) => Promise<void>;
  removeBilling: (id: string) => Promise<void>;

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
  systemLogs: SystemLog[];
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
  addLog: (type: string, message: string, severity: SystemLog['severity']) => void;

  // General
  reloadData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  // ─── STATE ─────────────────────────────────────────────
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [visits, setVisits] = useState<KanbanItem[]>([]);

  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthlyGoals, setMonthlyGoals] = useState<Record<string, number>>({});

  // Admin & Health
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [isAdmin, setIsAdmin] = useState(hasAppPin());

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
    try {
      await fetch('/api/init-db').catch(() => ({}));

      const [clientsData, billingsData, kanbanData, goalsData] = await Promise.all([
        apiService.getClients().catch(() => []),
        apiService.getBillings().catch(() => []),
        apiService.getKanbanItems().catch(() => []),
        apiService.getMonthlyGoals().catch(() => ({}))
      ]);

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
        status: c.status || c.situacao_cadastral === 'INATIVA' ? 'inativo' : 'ativo',
        created_at: c.created_at,
      })));

      // Billings
      setBillings(billingsData.map((b: any) => ({
        ...b,
        id: b.id?.toString() || Math.random().toString(),
        descricao: b.descricao || b.nf || '',
        tipo: b.tipo || 'entrada',
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

      if (isAdmin) {
        const logs = await apiService.getLogs();
        setSystemLogs(logs.map((l: any) => ({
          ...l,
          id: l.id.toString(),
          timestamp: new Date(l.timestamp).toLocaleTimeString()
        })));
      }
    } catch (error) {
      console.error('Falha ao carregar dados do CRM:', error);
    }
  }, [isAdmin]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

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

  // ─── LOGS ──────────────────────────────────────────────
  const addLog = async (type: string, message: string, severity: SystemLog['severity']) => {
    try {
      const newLog = await apiService.addLog(type, severity, message);
      setSystemLogs(prev => [{
        ...newLog,
        id: newLog.id.toString(),
        timestamp: new Date(newLog.timestamp).toLocaleTimeString()
      }, ...prev].slice(0, 50));
    } catch (_e: any) {
      setSystemLogs((prev: SystemLog[]) => [{
        id: 'error-' + Date.now(),
        type, message, severity,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 50));
    }
  };

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
      status: 'ativo',
    };
    setClients((prev: Client[]) => [...prev, mapped]);
    addLog('SYSTEM_INFO', `Novo cliente: ${mapped.nome}`, 'INFO');
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
    addLog('SYSTEM_INFO', `Cliente atualizado: ${data.nome || id}`, 'INFO');
  };

  const removeClient = async (id: string) => {
    await apiService.removeClient(id);
    setClients((prev: Client[]) => prev.filter((c: Client) => c.id !== id));
    addLog('SYSTEM_INFO', `Cliente removido ID: ${id}`, 'WARNING');
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
    addLog('SYSTEM_INFO', `Novo projeto: ${data.ambiente}`, 'INFO');
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
      valor: Number(saved.valor),
      categoria: saved.categoria || data.categoria || 'outros',
      status: saved.status || 'PAGO'
    }, ...prev]);
    addLog('SYSTEM_INFO', `Registro financeiro: ${data.descricao}`, 'INFO');
  };

  const updateBilling = async (id: string, data: any) => {
    const saved = await apiService.updateBilling(id, data);
    setBillings((prev: Billing[]) => prev.map((b: Billing) =>
      b.id === id ? {
        ...saved,
        id: saved.id.toString(),
        descricao: saved.descricao || data.descricao || b.descricao,
        tipo: saved.tipo || data.tipo || b.tipo,
        valor: Number(saved.valor),
        categoria: saved.categoria || data.categoria || b.categoria,
        status: saved.status || data.status || b.status
      } : b
    ));
  };

  const removeBilling = async (id: string) => {
    await apiService.removeBilling(id);
    setBillings((prev: Billing[]) => prev.filter((b: Billing) => b.id !== id));
    addLog('SYSTEM_INFO', `Registro financeiro removido ID: ${id}`, 'WARNING');
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
  return (
    <AppContext.Provider value={{
      clients, addClient, updateClient, removeClient,
      projects, addProject, updateProject, removeProject,
      visits, updateKanbanStatus, addKanbanItem, updateKanbanItem,
      billings, addBilling, updateBilling, removeBilling,
      monthlyGoals, setMonthlyGoal, selectedPeriod, setSelectedPeriod,
      currentMeta, metaMensal, setMetaMensal,
      totalFaturadoMes, totalPeriodo,
      systemLogs, isAdmin, setIsAdmin, addLog,
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
