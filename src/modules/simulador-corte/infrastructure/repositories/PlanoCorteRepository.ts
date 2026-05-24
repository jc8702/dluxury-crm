import { api } from '../../../../lib/api';
import type { PlanoCorteCarregado } from '../../domain/types';

export async function listarPlanos(): Promise<PlanoCorteCarregado[]> {
  const data = await api.planoCorte.list() as any;
  return (data?.data || data || []) as PlanoCorteCarregado[];
}

export async function carregarPlano(id: string): Promise<PlanoCorteCarregado | null> {
  try {
    const data = await api.planoCorte.get(id) as any;
    return (data?.data || data) as PlanoCorteCarregado;
  } catch {
    return null;
  }
}
