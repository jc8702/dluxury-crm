import { useState, useCallback } from 'react';
import { api } from '../../../lib/api';

export function useRH() {
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [folhas, setFolhas] = useState<any[]>([]);
  const [adiantamentos, setAdiantamentos] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadColaboradores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.rh.colaboradores.list();
      setColaboradores(Array.isArray(data) ? data : []);
      setError(null);
      return data;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const createColaborador = useCallback(async (payload: any) => {
    const data = await api.rh.colaboradores.create(payload);
    setColaboradores((prev) => [...prev, data]);
    return data;
  }, []);

  const updateColaborador = useCallback(async (id: string, payload: any) => {
    const data = await api.rh.colaboradores.update(id, payload);
    setColaboradores((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  }, []);

  const deleteColaborador = useCallback(async (id: string) => {
    await api.rh.colaboradores.delete(id);
    setColaboradores((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const fetchPresencas = useCallback(async (colaboradorId: string, mes: string) => {
    return await api.rh.presencas.list(colaboradorId, mes);
  }, []);

  const upsertPresencas = useCallback(async (presencas: any[]) => {
    return await api.rh.presencas.upsertBulk(presencas);
  }, []);

  const loadAdiantamentos = useCallback(async (params?: any) => {
    const data = await api.rh.adiantamentos.list(params);
    setAdiantamentos(Array.isArray(data) ? data : []);
    return data;
  }, []);

  const createAdiantamento = useCallback(async (payload: any) => {
    const data = await api.rh.adiantamentos.create(payload);
    setAdiantamentos((prev) => [data, ...prev]);
    return data;
  }, []);

  const loadFolhas = useCallback(async () => {
    const data = await api.rh.folhas.list();
    setFolhas(Array.isArray(data) ? data : []);
    return data;
  }, []);

  const createFolha = useCallback(async (competencia: string) => {
    const data = await api.rh.folhas.create(competencia);
    setFolhas((prev) => [data, ...prev]);
    return data;
  }, []);

  const getFolha = useCallback(async (id: string) => {
    return await api.rh.folhas.get(id);
  }, []);

  const updateFolhaItem = useCallback(async (folhaId: string, itemId: string, payload: any) => {
    return await api.rh.folhas.updateItem(folhaId, itemId, payload);
  }, []);

  const fecharFolha = useCallback(async (id: string) => {
    return await api.rh.folhas.fechar(id);
  }, []);

  const reabrirFolha = useCallback(async (id: string) => {
    return await api.rh.folhas.reabrir(id);
  }, []);

  const loadDashboard = useCallback(async (mes: string) => {
    const data = await api.rh.dashboard(mes);
    setDashboard(data);
    return data;
  }, []);

  return {
    colaboradores,
    folhas,
    adiantamentos,
    dashboard,
    loading,
    error,
    loadColaboradores,
    createColaborador,
    updateColaborador,
    deleteColaborador,
    fetchPresencas,
    upsertPresencas,
    loadAdiantamentos,
    createAdiantamento,
    loadFolhas,
    createFolha,
    getFolha,
    updateFolhaItem,
    fecharFolha,
    reabrirFolha,
    loadDashboard,
  };
}
