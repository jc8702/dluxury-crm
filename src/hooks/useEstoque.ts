import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useInventoryStore as useInventory } from '../stores/useInventoryStore';

export function useEstoque() {
  const { reloadInventoryData } = useInventory();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listarMateriais = useCallback(async (filtros?: any) => {
    setLoading(true);
    try {
      const data = await api.estoque.list();
      // Filtros em memória por enquanto (o backend já retorna tudo)
      if (!filtros) return data;

      return data.filter((m: any) => {
        let match = true;
        if (filtros.categoria_id && m.categoria_id !== filtros.categoria_id) match = false;
        if (
          filtros.search &&
          !m.nome.toLowerCase().includes(filtros.search.toLowerCase()) &&
          !m.sku.toLowerCase().includes(filtros.search.toLowerCase())
        )
          match = false;
        return match;
      });
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarMaterial = useCallback(async (id: string) => {
    // Não há endpoint de leitura única — filtra a listagem em memória.
    const materiais = await api.estoque.list();
    return materiais.find((m: any) => String(m.id) === String(id)) ?? null;
  }, []);

  const criarMaterial = useCallback(
    async (data: any) => {
      await api.estoque.create(data);
      await reloadInventoryData();
    },
    [reloadInventoryData],
  );

  const editarMaterial = useCallback(
    async (id: string, data: any) => {
      await api.estoque.update(id, data);
      await reloadInventoryData();
    },
    [reloadInventoryData],
  );

  const registrarEntrada = useCallback(
    async (materialId: string, quantidade: number, motivo: string, precoUnitario?: number) => {
      await api.estoque.addMovimentacao({
        material_id: materialId,
        tipo: 'entrada',
        quantidade,
        motivo,
        preco_unitario: precoUnitario,
      });
      await reloadInventoryData();
    },
    [reloadInventoryData],
  );

  const registrarSaida = useCallback(
    async (materialId: string, quantidade: number, motivo: string, projetoId?: string) => {
      await api.estoque.addMovimentacao({
        material_id: materialId,
        tipo: 'saida',
        quantidade,
        motivo,
        projeto_id: projetoId,
      });
      await reloadInventoryData();
    },
    [reloadInventoryData],
  );

  const registrarAjuste = useCallback(
    async (materialId: string, estoqueNovo: number, motivo: string) => {
      await api.estoque.addMovimentacao({
        material_id: materialId,
        tipo: 'ajuste',
        quantidade: estoqueNovo,
        motivo,
      });
      await reloadInventoryData();
    },
    [reloadInventoryData],
  );

  const listarMovimentacoes = useCallback(async (materialId?: string) => {
    return api.estoque.getMovimentacoes(materialId);
  }, []);

  const listarAbaixoMinimo = useCallback(async () => {
    const materiais = await api.estoque.list();
    return materiais.filter((m: any) => Number(m.estoque_atual) <= Number(m.estoque_minimo));
  }, []);

  return {
    loading,
    error,
    listarMateriais,
    buscarMaterial,
    criarMaterial,
    editarMaterial,
    registrarEntrada,
    registrarSaida,
    registrarAjuste,
    listarMovimentacoes,
    listarAbaixoMinimo,
  };
}
