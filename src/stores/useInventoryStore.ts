import { create } from 'zustand';
import { api } from '../lib/api';
import { CategoriaMaterial, Material, MovimentacaoEstoque, Fornecedor } from '../types';

interface InventoryState {
  categorias: CategoriaMaterial[];
  materiais: Material[];
  movimentacoes: MovimentacaoEstoque[];
  fornecedores: Fornecedor[];

  addMaterial: (data: any) => Promise<void>;
  updateMaterial: (id: string, data: any) => Promise<void>;
  removeMaterial: (id: string) => Promise<void>;
  registrarMovimentacao: (data: any) => Promise<void>;
  addFornecedor: (data: any) => Promise<void>;
  updateFornecedor: (id: string, data: any) => Promise<void>;
  removeFornecedor: (id: string) => Promise<void>;

  reloadInventoryData: () => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  categorias: [],
  materiais: [],
  movimentacoes: [],
  fornecedores: [],

  reloadInventoryData: async () => {
    try {
      const [catsData, matsData, fornsData, movsData] = await Promise.all([
        api.estoqueCategorias.list().catch(() => []),
        api.estoque.list().catch(() => []),
        api.estoque.fornecedores.list().catch(() => []),
        api.estoque.getMovimentacoes().catch(() => []),
      ]);

      const materiais = Array.isArray(matsData)
        ? matsData.map((m: any) => ({
            ...m,
            id: String(m.id || ''),
            fator_conversao: Number(m.fator_conversao || 1),
            estoque_atual: Number(m.estoque_atual || 0),
            estoque_minimo: Number(m.estoque_minimo || 0),
            preco_custo: Number(m.preco_custo || 0),
            preco_venda: m.preco_venda ? Number(m.preco_venda) : undefined,
          }))
        : [];

      const movimentacoes = Array.isArray(movsData)
        ? movsData.map((m: any) => ({
            ...m,
            id: String(m.id || ''),
            quantidade: Number(m.quantidade || 0),
            estoque_antes: Number(m.estoque_antes || 0),
            estoque_depois: Number(m.estoque_depois || 0),
            preco_unitario: Number(m.preco_unitario || 0),
            valor_total: Number(m.valor_total || 0),
          }))
        : [];

      set({
        categorias: Array.isArray(catsData) ? catsData : [],
        materiais,
        fornecedores: Array.isArray(fornsData) ? fornsData : [],
        movimentacoes,
      });
    } catch (error) {
      console.error('Falha ao carregar dados do Inventario:', error);
    }
  },

  addMaterial: async (data: any) => {
    await api.estoque.create(data);
    await get().reloadInventoryData();
  },
  updateMaterial: async (id: string, data: any) => {
    await api.estoque.update(id, data);
    await get().reloadInventoryData();
  },
  removeMaterial: async (id: string) => {
    await api.estoque.delete(id);
    await get().reloadInventoryData();
  },

  registrarMovimentacao: async (data: any) => {
    await api.estoque.addMovimentacao(data);
    await get().reloadInventoryData();
  },

  addFornecedor: async (data: any) => {
    await api.estoque.fornecedores.create(data);
    await get().reloadInventoryData();
  },
  updateFornecedor: async (id: string, data: any) => {
    await api.estoque.fornecedores.update(id, data);
    await get().reloadInventoryData();
  },
  removeFornecedor: async (id: string) => {
    await api.estoque.fornecedores.delete(id);
    await get().reloadInventoryData();
  },
}));
