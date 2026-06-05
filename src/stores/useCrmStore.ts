import { create } from 'zustand';
import { api } from '../lib/api';
import type { Client, Project, Quotation } from '../types';

interface CrmState {
  clients: Client[];
  projects: Project[];
  quotations: Quotation[];
  events: any[];
  visits: any[];

  // Actions
  addClient: (data: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  removeClient: (id: string) => Promise<void>;

  addProject: (data: Omit<Project, 'id'>) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  removeProject: (id: string) => Promise<void>;

  addOrcamento: (data: any) => Promise<void>;
  updateOrcamento: (id: string, data: any) => Promise<void>;
  removeOrcamento: (id: string) => Promise<void>;

  removeVisit: (id: string) => Promise<void>;

  reloadCRMData: () => Promise<void>;
  loadEvents: () => Promise<void>;
  updateKanbanStatus: (id: string, status: string) => Promise<void>;
}

export const useCrmStore = create<CrmState>((set, get) => ({
  clients: [],
  projects: [],
  quotations: [],
  events: [],
  visits: [],

  reloadCRMData: async () => {
    try {
      const [clientsData, agendaData, projectsData, orcamentosData] = await Promise.all([
        api.clients.list().catch(() => []),
        api.agenda.list().catch(() => []),
        api.projects.list().catch(() => []),
        api.quotations.list().catch(() => []),
      ]);

      const clients = clientsData.map((c: any) => ({
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
      }));

      const events = Array.isArray(agendaData) ? agendaData : [];

      const projectItems = [
        ...(Array.isArray(projectsData)
          ? projectsData.map((i: any) => ({ ...i, type: 'project' }))
          : []),
        ...(Array.isArray(agendaData)
          ? agendaData.filter((i: any) => (i.tipo || '').toLowerCase() === 'projeto')
          : []),
      ];

      const mapLegacyStatus = (status: string) => {
        const map: Record<string, any> = {
          novo: 'lead',
          analise: 'visita_tecnica',
          proposta: 'orcamento_enviado',
          negociacao: 'orcamento_enviado',
          assinatura: 'aprovado',
          ganho: 'concluido',
          corte: 'em_producao',
          producao: 'em_producao',
          pendente: 'lead',
        };
        return map[(status || '').toLowerCase()] || status || 'lead';
      };

      const projects = projectItems.map((p: any) => ({
        id: p.id?.toString(),
        clientId: p.client_id || '',
        clientName: p.client_name || p.cliente_nome || p.subtitle || 'Sem Nome',
        ambiente: p.ambiente || p.title || p.titulo || 'Sem Ambiente',
        descricao: p.descricao || p.description || p.observations || '',
        valorEstimado: p.valor_orcamento_atual
          ? Number(p.valor_orcamento_atual)
          : p.valor_estimado || p.value || 0,
        status: mapLegacyStatus(p.status || p.status_visita),
        observacoes: p.observacoes || p.observations || '',
        tag: p.tag || '',
        ordem_producao_id: p.ordem_producao_id || null,
        orcamentoId: p.quotation_id || p.orcamentoId || '',
        visitaId: p.visita_id || p.visitaId || '',
      }));

      const quotations = Array.isArray(orcamentosData)
        ? orcamentosData.map((o: any) => ({
            ...o,
            id: String(o.id || ''),
            valor_base: Number(o.valor_base || 0),
            valor_final: Number(o.valor_final || 0),
            taxa_mensal: Number(o.taxa_mensal || 0),
            adicional_urgencia_pct: Number(o.adicional_urgencia_pct || 0),
          }))
        : [];

      const visits = events
        .filter((e: any) => (e.tipo || '').toLowerCase() === 'visita')
        .map((v: any) => ({
          ...v,
          id: v.id?.toString(),
          title: v.titulo || 'Visita Sem Título',
          subtitle: v.cliente_nome || 'Sem Cliente',
          status: v.status_visita || 'agendado',
        }));

      set({ clients, events, projects, quotations, visits });
    } catch (error) {
      console.error('Falha ao carregar dados do CRM:', error);
    }
  },

  addClient: async (data: any) => {
    await api.clients.create(data);
    await get().reloadCRMData();
  },
  updateClient: async (id: string, data: any) => {
    await api.clients.update(id, data);
    await get().reloadCRMData();
  },
  removeClient: async (id: string) => {
    await api.clients.delete(id);
    set((state) => ({ clients: state.clients.filter((c) => c.id !== id) }));
  },

  addProject: async (data: Omit<Project, 'id'>) => {
    const payload = {
      title: data.ambiente,
      ambiente: data.ambiente,
      subtitle: data.clientName || '',
      client_name: data.clientName || '',
      status: data.status || 'lead',
      type: 'project',
      value: data.valorEstimado,
      valor_estimado: data.valorEstimado,
      observations: data.observacoes || data.descricao || '',
      observacoes: data.observacoes,
      description: data.descricao || '',
      descricao: data.descricao,
      prazo_entrega: data.prazoEntrega,
      responsavel: data.responsavel,
      tag: data.tag,
      client_id: data.clientId,
      quotation_id: data.orcamentoId === 'none' ? null : data.orcamentoId,
      visita_id: data.visitaId === 'none' ? null : data.visitaId,
    };
    await api.projects.create(payload);
    await get().reloadCRMData();
  },
  updateProject: async (id: string, data: Partial<Project>) => {
    const payload: any = {};
    if (data.ambiente) {
      payload.title = data.ambiente;
      payload.ambiente = data.ambiente;
    }
    if (data.clientName) {
      payload.subtitle = data.clientName;
      payload.client_name = data.clientName;
    }
    if (data.status) payload.status = data.status;
    if (data.valorEstimado !== undefined) {
      payload.value = data.valorEstimado;
      payload.valor_estimado = data.valorEstimado;
    }
    if (data.observacoes) {
      payload.observations = data.observacoes;
      payload.observacoes = data.observacoes;
    }
    if (data.descricao) {
      payload.description = data.descricao;
      payload.descricao = data.descricao;
    }
    if (data.prazoEntrega) payload.prazo_entrega = data.prazoEntrega;
    if (data.responsavel) payload.responsavel = data.responsavel;
    if (data.clientId !== undefined) payload.client_id = data.clientId;
    if (data.orcamentoId !== undefined)
      payload.quotation_id = data.orcamentoId === 'none' ? null : data.orcamentoId;
    if (data.visitaId !== undefined)
      payload.visita_id = data.visitaId === 'none' ? null : data.visitaId;
    await api.projects.update(id, payload);
    await get().reloadCRMData();
  },
  removeProject: async (id: string) => {
    await api.projects.delete(id);
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
  },

  addOrcamento: async (data: any) => {
    await api.quotations.create(data);
    await get().reloadCRMData();
  },
  updateOrcamento: async (id: string, data: any) => {
    await api.quotations.update(id, data);
    await get().reloadCRMData();
  },
  removeOrcamento: async (id: string) => {
    await api.quotations.delete(id);
    set((state) => ({ quotations: state.quotations.filter((o) => o.id !== id) }));
  },

  removeVisit: async (id: string) => {
    await api.agenda.delete(id);
    await get().reloadCRMData();
  },

  loadEvents: async () => {
    await get().reloadCRMData();
  },

  updateKanbanStatus: async (id: string, status: string) => {
    await api.agenda.move(id, status);
    await get().reloadCRMData();
  },
}));
