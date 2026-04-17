import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useAppContext } from '../context/AppContext';

export function useEstoque() {
  const { reloadData } = useAppContext();
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
        if (filtros.search && !m.nome.toLowerCase().includes(filtros.search.toLowerCase()) && !m.sku.toLowerCase().includes(filtros.search.toLowerCase())) match = false;
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
    return api.estoque.get(id);
  }, []);

  const criarMaterial = useCallback(async (data: any) => {
    await api.estoque.create(data);
    await reloadData();
  }, [reloadData]);

  const editarMaterial = useCallback(async (id: string, data: any) => {
    await api.estoque.update(id, data);
    await reloadData();
  }, [reloadData]);

  const registrarEntrada = useCallback(async (materialId: string, quantidade: number, motivo: string, precoUnitario?: number) => {
    await api.estoque.movimentacoes.create({
      material_id: materialId,
      tipo: 'entrada',
      quantidade,
      motivo,
      preco_unitario: precoUnitario
    });
    await reloadData();
  }, [reloadData]);

  const registrarSaida = useCallback(async (materialId: string, quantidade: number, motivo: string, projetoId?: string) => {
    await api.estoque.movimentacoes.create({
      material_id: materialId,
      tipo: 'saida',
      quantidade,
      motivo,
      projeto_id: projetoId
    });
    await reloadData();
  }, [reloadData]);

  const registrarAjuste = useCallback(async (materialId: string, estoqueNovo: number, motivo: string) => {
    await api.estoque.movimentacoes.create({
      material_id: materialId,
      tipo: 'ajuste',
      quantidade: estoqueNovo,
      motivo
    });
    await reloadData();
  }, [reloadData]);

  const listarMovimentacoes = useCallback(async (materialId?: string) => {
    return api.estoque.movimentacoes.list(materialId);
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
    listarAbaixoMinimo
  };
}

