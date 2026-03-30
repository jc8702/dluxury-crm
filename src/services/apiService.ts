/**
 * API SERVICE
 * Centralized fetch wrapper for the Corporate CRM Simulator.
 */

const getPin = () => sessionStorage.getItem('app_pin') || '';

export const apiService = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'x-pin-auth': getPin(),
      ...options.headers,
    };

    const response = await fetch(endpoint, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
  },

  // Clients
  getClients: () => apiService.fetch('/api/clients'),
  addClient: (data: any) => apiService.fetch('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: string, data: any) => 
    apiService.fetch(`/api/clients?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeClient: (id: string) => apiService.fetch(`/api/clients?id=${id}`, { method: 'DELETE' }),

  // Billings
  getBillings: () => apiService.fetch('/api/billings'),
  addBilling: (data: any) => apiService.fetch('/api/billings', { method: 'POST', body: JSON.stringify(data) }),
  updateBilling: (id: string, data: any) => 
    apiService.fetch(`/api/billings?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeBilling: (id: string) => apiService.fetch(`/api/billings?id=${id}`, { method: 'DELETE' }),

  // Kanban
  getKanbanItems: () => apiService.fetch('/api/kanban'),
  addKanbanItem: (data: any) => apiService.fetch('/api/kanban', { method: 'POST', body: JSON.stringify(data) }),
  updateKanbanStatus: (id: string, status: string) => 
    apiService.fetch(`/api/kanban?id=${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Logs
  getLogs: () => apiService.fetch('/api/logs'),
  addLog: (type: string, severity: string, message: string) => 
    apiService.fetch('/api/logs', { method: 'POST', body: JSON.stringify({ type, severity, message }) }),
};

export const setAppPin = (pin: string) => sessionStorage.setItem('app_pin', pin);
export const hasAppPin = () => !!sessionStorage.getItem('app_pin');
