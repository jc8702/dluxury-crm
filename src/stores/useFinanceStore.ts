import { create } from 'zustand';
import { api } from '../lib/api';
import { Billing, CondicaoPagamento } from '../types';

interface FinanceState {
  billings: Billing[];
  condicoesPagamento: CondicaoPagamento[];
  monthlyGoals: Record<string, number>;
  selectedPeriod: string;

  setSelectedPeriod: (period: string) => void;
  setMonthlyGoal: (period: string, amount: number) => Promise<void>;

  addBilling: (billing: Omit<Billing, 'id'>) => Promise<void>;
  updateBilling: (id: string, billing: Partial<Billing>) => Promise<void>;
  removeBilling: (id: string) => Promise<void>;

  addCondicaoPagamento: (data: any) => Promise<void>;
  updateCondicaoPagamento: (id: string, data: any) => Promise<void>;
  removeCondicaoPagamento: (id: string) => Promise<void>;

  reloadFinanceData: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  billings: [],
  condicoesPagamento: [],
  monthlyGoals: {},
  selectedPeriod: (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })(),

  setSelectedPeriod: (period: string) => set({ selectedPeriod: period }),

  reloadFinanceData: async () => {
    try {
      const [billingsData, condicoesData, goalsData] = await Promise.all([
        api.billings.list().catch(() => []),
        api.condicoesPagamento.list().catch(() => []),
        api.goals.list().catch(() => []),
      ]);

      const billings = Array.isArray(billingsData)
        ? billingsData.map((b: any) => ({
            ...b,
            id: b.id?.toString() || Math.random().toString(),
            descricao: b.descricao || b.nf || '',
            tipo: b.tipo || 'entrada',
            projectId: b.project_id || b.projectId,
            cliente: b.cliente || '',
            valor: Number(b.valor),
            categoria: b.categoria || 'outros',
            status: b.status || 'PAGO',
          }))
        : [];

      const condicoesPagamento = Array.isArray(condicoesData)
        ? condicoesData.map((c: any) => ({
            ...c,
            n_parcelas: Number(c.n_parcelas || 1),
          }))
        : [];

      set({
        billings,
        condicoesPagamento,
        monthlyGoals: goalsData || {},
      });
    } catch (error) {
      console.error('Falha ao carregar dados do Financeiro:', error);
    }
  },

  addBilling: async (data: Omit<Billing, 'id'>) => {
    await api.billings.create(data);
    await get().reloadFinanceData();
  },
  updateBilling: async (id: string, data: Partial<Billing>) => {
    await api.billings.update(id, data);
    await get().reloadFinanceData();
  },
  removeBilling: async (id: string) => {
    await api.billings.delete(id);
    await get().reloadFinanceData();
  },

  addCondicaoPagamento: async (data: any) => {
    await api.condicoesPagamento.create(data);
    await get().reloadFinanceData();
  },
  updateCondicaoPagamento: async (id: string, data: any) => {
    await api.condicoesPagamento.update(id, data);
    await get().reloadFinanceData();
  },
  removeCondicaoPagamento: async (id: string) => {
    await api.condicoesPagamento.delete(id);
    await get().reloadFinanceData();
  },

  setMonthlyGoal: async (period: string, amount: number) => {
    try {
      await api.goals.update(period, amount);
      set((state) => ({
        monthlyGoals: { ...state.monthlyGoals, [period]: amount },
      }));
    } catch (error) {
      console.error('Erro ao salvar meta mensal:', error);
      set((state) => ({
        monthlyGoals: { ...state.monthlyGoals, [period]: amount },
      }));
    }
  },
}));
