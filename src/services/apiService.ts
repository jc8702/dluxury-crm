/**
 * API SERVICE — D'LUXURY AMBIENTES CRM
 * Centralized fetch wrapper com suporte JWT.
 */

const getToken = () => localStorage.getItem('dluxury_token') || '';

export const apiService = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    // Add JWT Token to Authorization header
    const token = getToken();
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, { ...options, headers });

    if (!response.ok) {
      // Allow components to handle 401 specifically if needed
      if (response.status === 401) {
         if (typeof window !== 'undefined' && endpoint !== '/api/auth?action=me' && endpoint !== '/api/auth?action=login') {
            // Emissão global para logout ou redirecionamento pode ser adicionada aqui
            console.error('Session expired');
         }
      }
      const errorData = await response.json().catch(() => ({}));
      const fullError = errorData.error 
        ? `${errorData.error}${errorData.details ? `: ${errorData.details}` : ''}` 
        : `HTTP error! status: ${response.status}`;
      throw new Error(fullError);
    }

    if (response.status === 204) return null;
    return response.json();
  },

  // Auth
  login: (credentials: any) => apiService.fetch('/api/auth?action=login', { method: 'POST', body: JSON.stringify(credentials) }),
  checkSession: () => apiService.fetch('/api/auth?action=me'),

  // Clients
  getClients: () => apiService.fetch('/api/clients'),
  addClient: (data: any) => apiService.fetch('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: string, data: any) =>
    apiService.fetch(`/api/clients?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeClient: (id: string) => apiService.fetch(`/api/clients?id=${id}`, { method: 'DELETE' }),

  // Projects
  getProjects: () => apiService.fetch('/api/projects'),
  getProjectsByClient: (clientId: string) => apiService.fetch(`/api/projects?client_id=${clientId}`),
  getProjectsByStatus: (status: string) => apiService.fetch(`/api/projects?status=${status}`),
  addProject: (data: any) => apiService.fetch('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: any) =>
    apiService.fetch(`/api/projects?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeProject: (id: string) => apiService.fetch(`/api/projects?id=${id}`, { method: 'DELETE' }),

  // Billings
  getBillings: () => apiService.fetch('/api/billings'),
  addBilling: (data: any) => apiService.fetch('/api/billings', { method: 'POST', body: JSON.stringify(data) }),
  updateBilling: (id: string, data: any) =>
    apiService.fetch(`/api/billings?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeBilling: (id: string) => apiService.fetch(`/api/billings?id=${id}`, { method: 'DELETE' }),

  // Users (Admin Only)
  getUsers: () => apiService.fetch('/api/users'),
  registerUser: (data: any) => apiService.fetch('/api/auth?action=register', { method: 'POST', body: JSON.stringify(data) }),
  removeUser: (id: string) => apiService.fetch(`/api/users?id=${id}`, { method: 'DELETE' }),
  updateProfile: (data: any) => apiService.fetch('/api/users', { method: 'PATCH', body: JSON.stringify(data) }),

  // Estoque (Materiais e Categorias)
  getCategorias: () => apiService.fetch('/api/estoque?type=categories'),
  getMateriais: () => apiService.fetch('/api/estoque'),
  getMaterial: (id: string) => apiService.fetch(`/api/estoque?id=${id}`),
  addMaterial: (data: any) => apiService.fetch('/api/estoque', { method: 'POST', body: JSON.stringify(data) }),
  updateMaterial: (id: string, data: any) => apiService.fetch(`/api/estoque?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeMaterial: (id: string) => apiService.fetch(`/api/estoque?id=${id}`, { method: 'DELETE' }),

  // Movimentações (consolidado em /api/estoque?type=movimentacoes)
  getMovimentacoes: (materialId?: string) => 
    apiService.fetch(`/api/estoque?type=movimentacoes${materialId ? `&material_id=${materialId}` : ''}`),
  registrarMovimentacao: (data: any) => apiService.fetch('/api/estoque?type=movimentacoes', { method: 'POST', body: JSON.stringify(data) }),

  // Fornecedores (consolidado em /api/estoque?type=fornecedores)
  getFornecedores: () => apiService.fetch('/api/estoque?type=fornecedores'),
  addFornecedor: (data: any) => apiService.fetch('/api/estoque?type=fornecedores', { method: 'POST', body: JSON.stringify(data) }),
  updateFornecedor: (id: string, data: any) => apiService.fetch(`/api/estoque?type=fornecedores&id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeFornecedor: (id: string) => apiService.fetch(`/api/estoque?type=fornecedores&id=${id}`, { method: 'DELETE' }),

  // Kanban (Visits)
  getKanbanItems: () => apiService.fetch('/api/kanban'),
  addKanbanItem: (data: any) => apiService.fetch('/api/kanban', { method: 'POST', body: JSON.stringify(data) }),
  updateKanbanStatus: (id: string, status: string, extraData: any = {}) =>
    apiService.fetch(`/api/kanban?id=${id}`, { method: 'PATCH', body: JSON.stringify({ status, ...extraData }) }),

  // Monthly Goals
  getMonthlyGoals: () => apiService.fetch('/api/goals'),
  updateMonthlyGoal: (period: string, amount: number) =>
    apiService.fetch('/api/goals', { method: 'POST', body: JSON.stringify({ period, amount }) }),

  // AI Copilot Skills
  aiGenerateBOM: (payload: { tipo: string; medidas: { L: number; A: number; P: number }; observacoes?: string }) =>
    apiService.fetch('/api/ai-copilot', { method: 'POST', body: JSON.stringify({ skill: 'generate-bom', payload }) }),

  aiAuditSKU: (payload: { nome: string; descricao: string; categoria_id?: string }) =>
    apiService.fetch('/api/ai-copilot', { method: 'POST', body: JSON.stringify({ skill: 'audit-sku', payload }) }),
  
  aiChat: (message: string, history?: any[]) =>
    apiService.fetch('/api/ai-copilot', { method: 'POST', body: JSON.stringify({ skill: 'chat', payload: { message, history } }) }),

  aiGetPurchaseSuggestions: () =>
    apiService.fetch('/api/ai-copilot', { method: 'POST', body: JSON.stringify({ skill: 'purchase-suggestion' }) }),

  aiDetectAnomalies: () =>
    apiService.fetch('/api/ai-copilot', { method: 'POST', body: JSON.stringify({ skill: 'detect-anomalies' }) }),

  // Orcamentos (Budgets)
  getOrcamentos: () => apiService.fetch('/api/orcamentos'),
  getOrcamento: (id: string) => apiService.fetch(`/api/orcamentos?id=${id}`),
  addOrcamento: (data: any) => apiService.fetch('/api/orcamentos', { method: 'POST', body: JSON.stringify(data) }),
  updateOrcamento: (id: string, data: any) =>
    apiService.fetch(`/api/orcamentos?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeOrcamento: (id: string) => apiService.fetch(`/api/orcamentos?id=${id}`, { method: 'DELETE' }),

  // Orcamento Técnico (Composição)
  getOrcamentoTree: (orcamentoId: string) => apiService.fetch(`/api/orcamento-tecnico?type=tree&orcamento_id=${orcamentoId}`),
  getTechnicalConfig: () => apiService.fetch('/api/orcamento-tecnico?type=config'),
  updateTechnicalConfig: (data: any) => apiService.fetch('/api/orcamento-tecnico?type=config', { method: 'PATCH', body: JSON.stringify(data) }),
  
  addAmbiente: (orcamentoId: string, data: any) => 
    apiService.fetch(`/api/orcamento-tecnico?type=ambiente&orcamento_id=${orcamentoId}`, { method: 'POST', body: JSON.stringify(data) }),
  addMovel: (ambienteId: string, data: any) => 
    apiService.fetch(`/api/orcamento-tecnico?type=movel&ambiente_id=${ambienteId}`, { method: 'POST', body: JSON.stringify(data) }),
  addPeca: (movelId: string, data: any) => 
    apiService.fetch(`/api/orcamento-tecnico?type=peca&movel_id=${movelId}`, { method: 'POST', body: JSON.stringify(data) }),
  addFerragem: (movelId: string, data: any) => 
    apiService.fetch(`/api/orcamento-tecnico?type=ferragem&movel_id=${movelId}`, { method: 'POST', body: JSON.stringify(data) }),
  addCustoExtra: (orcamentoId: string, data: any) => 
    apiService.fetch(`/api/orcamento-tecnico?type=extra&orcamento_id=${orcamentoId}`, { method: 'POST', body: JSON.stringify(data) }),

  updatePeca: (id: string, data: any) => 
    apiService.fetch(`/api/orcamento-tecnico?type=peca&id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  removeTechnicalEntity: (type: 'ambiente' | 'movel' | 'peca' | 'ferragem' | 'extra', id: string) => 
    apiService.fetch(`/api/orcamento-tecnico?type=${type}&id=${id}`, { method: 'DELETE' }),

  // Payment Conditions
  getCondicoesPagamento: () => apiService.fetch('/api/condicoes-pagamento'),
  addCondicaoPagamento: (data: any) => apiService.fetch('/api/condicoes-pagamento', { method: 'POST', body: JSON.stringify(data) }),
  updateCondicaoPagamento: (id: string, data: any) =>
    apiService.fetch(`/api/condicoes-pagamento?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeCondicaoPagamento: (id: string) => apiService.fetch(`/api/condicoes-pagamento?id=${id}`, { method: 'DELETE' }),
};

export const setAuthToken = (token: string) => localStorage.setItem('dluxury_token', token);
export const removeAuthToken = () => localStorage.removeItem('dluxury_token');
export const hasAuthToken = () => !!localStorage.getItem('dluxury_token');
