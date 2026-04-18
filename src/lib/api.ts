const API_BASE = '/api';
const TOKEN_KEY = 'dluxury_token';

export const setAuthToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const removeAuthToken = () => localStorage.removeItem(TOKEN_KEY);
export const hasAuthToken = () => !!localStorage.getItem(TOKEN_KEY);
const getToken = () => localStorage.getItem(TOKEN_KEY) || '';

export async function apiCall<T>(
  action: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: unknown
): Promise<T> {
  const url = action.startsWith('/') ? action : `${API_BASE}/${action}`;
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || json.message || `HTTP ${res.status}`);
  }

  const json: any = await res.json();
  
  // Se a resposta seguir o padrão { success, data }, retornamos apenas o data
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data;
  }

  return json;
}

export const api = {
  auth: {
    login: (credentials: any) => apiCall<any>('auth?action=login', 'POST', credentials),
    register: (data: any) => apiCall<any>('auth?action=register', 'POST', data),
    me: () => apiCall<any>('auth?action=me'),
  },
  clients: {
    list: () => apiCall<any[]>('clients'),
    create: (data: any) => apiCall<any>('clients', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`clients?id=${id}`, 'PATCH', data),
    delete: (id: string) => apiCall<any>(`clients?id=${id}`, 'DELETE'),
  },
  estoque: {
    list: (params?: any) => apiCall<any[]>(`estoque${params?.q ? `?q=${params.q}` : ''}`),
    create: (data: any) => apiCall<any>('estoque', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`estoque?id=${id}`, 'PATCH', data),
    getMovimentacoes: (materialId?: string) => apiCall<any[]>(`estoque?type=movimentacoes${materialId ? `&material_id=${materialId}` : ''}`),
    addMovimentacao: (data: any) => apiCall<any>('estoque?type=movimentacoes', 'POST', data),
    fornecedores: {
        list: () => apiCall<any[]>('estoque?type=fornecedores'),
        create: (data: any) => apiCall<any>('estoque?type=fornecedores', 'POST', data),
        update: (id: string, data: any) => apiCall<any>(`estoque?type=fornecedores&id=${id}`, 'PATCH', data),
        delete: (id: string) => apiCall<any>(`estoque?type=fornecedores&id=${id}`, 'DELETE'),
    }
  },
  orcamentos: {
    list: () => apiCall<any[]>('orcamentos'),
    get: (id: string) => apiCall<any>(`orcamentos?id=${id}`),
    create: (data: any) => apiCall<any>('orcamentos', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`orcamentos?id=${id}`, 'PATCH', data),
    delete: (id: string) => apiCall<any>(`orcamentos?id=${id}`, 'DELETE'),
  },
  projects: {
    list: () => apiCall<any[]>('projects'),
    create: (data: any) => apiCall<any>('projects', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`projects?id=${id}`, 'PATCH', data),
    delete: (id: string) => apiCall<any>(`projects?id=${id}`, 'DELETE'),
  },
  compras: {
    listPedidos: () => apiCall<any[]>('compras?type=pedidos'),
    getPedido: (id: string) => apiCall<any>(`compras?type=pedidos&id=${id}`),
    createPedido: (data: any) => apiCall<any>('compras?type=pedidos', 'POST', data),
    updatePedido: (id: string, data: any) => apiCall<any>(`compras?type=pedidos&id=${id}`, 'PATCH', data),
    addItem: (data: any) => apiCall<any>('compras?type=itens', 'POST', data),
    removeItem: (id: string) => apiCall<any>(`compras?type=itens&id=${id}`, 'DELETE'),
    registrarRecebimento: (data: any) => apiCall<any>('compras?type=recebimento', 'POST', data),
    getSugestoes: () => apiCall<any[]>('compras?type=sugestao'),
    getHistoricoPrecos: (materialId: string) => apiCall<any[]>(`compras?type=historico_precos&material_id=${materialId}`),
  },
  aprovacao: {
    gerarLink: (orcamentoId: string) => apiCall<any>('aprovacao?action=gerar', 'POST', { orcamento_id: orcamentoId }),
    getPublico: (token: string) => apiCall<any>(`aprovacao?token=${token}`),
    aprovar: (token: string, data: { nome: string }) => apiCall<any>(`aprovacao?token=${token}&action=aprovar`, 'POST', data),
    recusar: (token: string, data: { motivo: string }) => apiCall<any>(`aprovacao?token=${token}&action=recusar`, 'POST', data),
  },
  agenda: {
    list: (params: any = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiCall<any[]>(`agenda?${qs}`);
    },
    create: (data: any) => apiCall<any>('agenda', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`agenda?id=${id}`, 'PATCH', data),
    delete: (id: string) => apiCall<any>(`agenda?id=${id}`, 'DELETE'),
    syncVisitas: () => apiCall<any>('agenda?action=sincronizar', 'POST'),
  },
  notificacoes: {
    list: (unreadOnly = false) => apiCall<any[]>(`notificacoes?unread=${unreadOnly}`),
    getCount: () => apiCall<number>('notificacoes?action=contar'),
    markRead: (id: string) => apiCall<any>(`notificacoes?id=${id}`, 'PUT'),
    markAllRead: () => apiCall<any>('notificacoes?action=marcar-todas', 'PUT'),
    generate: () => apiCall<any>('notificacoes?action=gerar', 'POST'),
  },
  engineering: {
    list: () => apiCall<any[]>('engineering'),
    create: (data: any) => apiCall<any>('engineering', 'POST', data),
  },
  skus: {
    list: () => apiCall<any[]>('skus'),
    create: (data: any) => apiCall<any>('skus', 'POST', data),
  },
  reports: {
    get: (type: string, projectId?: string) => apiCall<any[]>(`reports?type=${type}${projectId ? `&projectId=${projectId}` : ''}`),
  },
  billings: {
    list: () => apiCall<any[]>('billings'),
    create: (data: any) => apiCall<any>('billings', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`billings?id=${id}`, 'PATCH', data),
    delete: (id: string) => apiCall<any>(`billings?id=${id}`, 'DELETE'),
  },
  kanban: {
    list: () => apiCall<any[]>('kanban'),
    create: (data: any) => apiCall<any>('kanban', 'POST', data),
    updateStatus: (id: string, status: string, extra: any = {}) => apiCall<any>(`kanban?id=${id}`, 'PATCH', { status, ...extra }),
  },
  goals: {
    list: () => apiCall<Record<string, number>>('goals'),
    update: (period: string, amount: number) => apiCall<any>('goals', 'POST', { period, amount }),
  },
  condicoesPagamento: {
    list: () => apiCall<any[]>('condicoes-pagamento'),
    create: (data: any) => apiCall<any>('condicoes-pagamento', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`condicoes-pagamento?id=${id}`, 'PATCH', data),
    delete: (id: string) => apiCall<any>(`condicoes-pagamento?id=${id}`, 'DELETE'),
  },
  users: {
    list: () => apiCall<any[]>('users'),
    update: (data: any) => apiCall<any>('users', 'PATCH', data),
    delete: (id: string) => apiCall<any>(`users?id=${id}`, 'DELETE'),
  },
  orcamentoTecnico: {
    getTree: (orcamentoId: string) => apiCall<any>(`orcamento-tecnico?type=tree&orcamento_id=${orcamentoId}`),
    getConfig: () => apiCall<any>('orcamento-tecnico?type=config'),
    updateConfig: (data: any) => apiCall<any>('orcamento-tecnico?type=config', 'PATCH', data),
    addEntity: (type: string, parentIdKey: string, parentId: string, data: any) => apiCall<any>(`orcamento-tecnico?type=${type}&${parentIdKey}=${parentId}`, 'POST', data),
    updateEntity: (type: string, id: string, data: any) => apiCall<any>(`orcamento-tecnico?type=${type}&id=${id}`, 'PATCH', data),
    deleteEntity: (type: string, id: string) => apiCall<any>(`orcamento-tecnico?type=${type}&id=${id}`, 'DELETE'),
  },
  estoqueCategorias: {
    list: () => apiCall<any[]>('estoque?type=categories'),
    create: (data: any) => apiCall<any>('estoque?type=categories', 'POST', data),
  },
  ai: {
    chat: (payload: any) => apiCall<any>('ai-copilot', 'POST', { skill: 'chat', payload }),
    generateBOM: (payload: any) => apiCall<any>('ai-copilot', 'POST', { skill: 'generate-bom', payload }),
    auditSKU: (payload: any) => apiCall<any>('ai-copilot', 'POST', { skill: 'audit-sku', payload }),
    purchaseSuggestion: () => apiCall<any>('ai-copilot', 'POST', { skill: 'purchase-suggestion' }),
    detectAnomalies: () => apiCall<any>('ai-copilot', 'POST', { skill: 'detect-anomalies' }),
  },
  cuttingPlan: {
    list: () => apiCall<any[]>('production?type=cutting_plan_list'),
    save: (data: any) => apiCall<any>('production?type=cutting_plan', 'POST', data),
  },
  afterSales: {
    list: () => apiCall<any[]>('after-sales'),
    getStats: () => apiCall<any>('after-sales?stats=true'),
    create: (data: any) => apiCall<any>('after-sales', 'POST', data),
    update: (data: any) => apiCall<any>('after-sales', 'PATCH', data),
  }
};

