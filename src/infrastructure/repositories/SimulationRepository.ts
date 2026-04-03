import { supabase } from '../supabaseClient';
import type { SimulationResult, SimulationInput } from '../../types/simulator';

export interface SimulationRecord {
  id?: string;
  cliente_id: string;
  cliente_nome: string;
  dados_simulacao: SimulationResult;
  dados_input: SimulationInput; 
  created_at?: string;
}

export const saveSimulation = async (record: SimulationRecord): Promise<SimulationRecord> => {
  const { data, error } = await supabase
    .from('simulations')
    .insert(record)
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao salvar no Supabase:', error);
    throw new Error(error.message);
  }
  return data as SimulationRecord;
};

export const listSimulations = async (clienteId?: string): Promise<SimulationRecord[]> => {
  let query = supabase
    .from('simulations')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (clienteId) {
    query = query.eq('cliente_id', clienteId);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar do Supabase:', error);
    throw new Error(error.message);
  }
  return (data || []) as SimulationRecord[];
};

export const getSimulation = async (id: string): Promise<SimulationRecord> => {
  const { data, error } = await supabase
    .from('simulations')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as SimulationRecord;
};
