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
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }

  return res.json();
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
    list: () => apiCall<any[]>('estoque'),
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
  }
};

