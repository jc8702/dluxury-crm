import type { SimulationResult, SimulationInput } from '../../types/simulator';

export interface SimulationRecord {
  id?: string;
  cliente_id: string;
  cliente_nome: string;
  dados_simulacao: SimulationResult;
  dados_input: SimulationInput; 
  created_at?: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('dluxury_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const saveSimulation = async (record: SimulationRecord): Promise<SimulationRecord> => {
  const response = await fetch('/api/simulations', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(record)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao salvar simulação');
  }
  
  return response.json();
};

export const listSimulations = async (clienteId?: string): Promise<SimulationRecord[]> => {
  const url = clienteId ? `/api/simulations?clienteId=${clienteId}` : '/api/simulations';
  const response = await fetch(url, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao listar simulações');
  }
  
  return response.json();
};

export const getSimulation = async (id: string): Promise<SimulationRecord> => {
  // Para simplicidade, usamos a listagem e filtramos no front ou estendemos a API se necessário
  const list = await listSimulations();
  const item = list.find(s => s.id === id);
  if (!item) throw new Error('Simulação não encontrada');
  return item;
};

