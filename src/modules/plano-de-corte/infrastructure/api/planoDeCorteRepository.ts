import { PlanoDeCorte } from '../../domain/entities/CuttingPlan';

const API_BASE = '/api/plano-corte';

export const planoDeCorteRepository = {
  async listar(): Promise<PlanoDeCorte[]> {
    const res = await fetch(API_BASE);
    const data = await res.json();
    return data.success ? data.data : [];
  },

  async buscarPorId(id: string): Promise<PlanoDeCorte | null> {
    const res = await fetch(`${API_BASE}?id=${id}`);
    const data = await res.json();
    return data.success ? data.data : null;
  },

  async criar(plano: Partial<PlanoDeCorte>): Promise<PlanoDeCorte> {
    const res = await fetch(`${API_BASE}?action=criar_plano`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plano)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async salvarResultado(planoId: string, materiais: any[], resultado: any, KPIs: any): Promise<void> {
    const res = await fetch(`${API_BASE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano_id: planoId, materiais, resultado, KPIs })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async aprovarProducao(materiaisConsumidos: { sku: string, qtd: number }[]): Promise<void> {
    const res = await fetch(`${API_BASE}?action=aprovar_producao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materiais_consumidos: materiaisConsumidos })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async buscarChapas(termo: string): Promise<any[]> {
    const res = await fetch(`/api/chapas?q=${encodeURIComponent(termo)}`);
    const data = await res.json();
    return data.success ? data.data : [];
  },

  async buscarEngenharia(termo: string): Promise<any[]> {
    const res = await fetch(`/api/engenharia/skus?q=${encodeURIComponent(termo)}`);
    const data = await res.json();
    return data.success ? data.data : [];
  }
};
