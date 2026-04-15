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
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
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

  // Inventory
  getInventory: () => apiService.fetch('/api/inventory'),
  addInventory: (data: any) => apiService.fetch('/api/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateInventory: (id: string, qty: number) => apiService.fetch(`/api/inventory?id=${id}`, { method: 'PATCH', body: JSON.stringify({ quantity: qty }) }),
  removeInventoryItem: (id: string) => apiService.fetch(`/api/inventory?id=${id}`, { method: 'DELETE' }),

  // Kanban (Visits)
  getKanbanItems: () => apiService.fetch('/api/kanban'),
  addKanbanItem: (data: any) => apiService.fetch('/api/kanban', { method: 'POST', body: JSON.stringify(data) }),
  updateKanbanStatus: (id: string, status: string, extraData: any = {}) =>
    apiService.fetch(`/api/kanban?id=${id}`, { method: 'PATCH', body: JSON.stringify({ status, ...extraData }) }),

  // Monthly Goals
  getMonthlyGoals: () => apiService.fetch('/api/goals'),
  updateMonthlyGoal: (period: string, amount: number) =>
    apiService.fetch('/api/goals', { method: 'POST', body: JSON.stringify({ period, amount }) }),
};

export const setAuthToken = (token: string) => localStorage.setItem('dluxury_token', token);
export const removeAuthToken = () => localStorage.removeItem('dluxury_token');
export const hasAuthToken = () => !!localStorage.getItem('dluxury_token');
