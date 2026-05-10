import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

export function useOrcamento(id?: string) {
    const [orcamento, setOrcamento] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const carregar = useCallback(async (orcId: string) => {
        setLoading(true);
        try {
            const data = await api.orcamentosPro.get(orcId);
            setOrcamento(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (id) carregar(id);
    }, [id, carregar]);

    const inicializar = useCallback(async (dados: any) => {
        setLoading(true);
        try {
            const res = await api.orcamentosPro.create({ header: dados, itens: [] });
            return res;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const setHeader = useCallback(async (updates: any) => {
        if (!id) return;
        try {
            await api.orcamentosPro.update(id, updates);
            await carregar(id);
        } catch (err: any) {
            console.error(err);
        }
    }, [id, carregar]);

    const addItem = useCallback(async (skuId: string, quantidade: number = 1) => {
        if (!id) return;
        setLoading(true);
        try {
            await api.orcamentosPro.addItem(id, skuId, quantidade);
            await carregar(id);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id, carregar]);

    const updateItemExplosion = useCallback(async (bomId: string, quantidadeAjustada: number) => {
        if (!id) return;
        try {
            await api.orcamentosPro.updateBOM(id, bomId, quantidadeAjustada);
            await carregar(id);
        } catch (err: any) {
            console.error(err);
        }
    }, [id, carregar]);

    const importItems = useCallback(async (itens: any[]) => {
        if (!id) {
            throw new Error('Orçamento não inicializado');
        }

        try {
            console.log('[useOrcamento] Importando itens:', itens.length);

            const response = await fetch('/api/orcamentos/importar-itens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orcamento_id: id,
                    itens: itens
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao importar');
            }

            const result = await response.json();
            console.log(`✅ [useOrcamento] ${result.itens_inseridos} itens importados`);

            // Recarregar orçamento completo
            await carregar(id);

            return result;
        } catch (error: any) {
            console.error('❌ [useOrcamento] Erro na importação:', error);
            setError(error.message);
            throw error;
        }
    }, [id, carregar]);

    const updateItem = useCallback(async (itemId: string, updates: any) => {
        if (!id) return;
        try {
            await api.orcamentosPro.updateItem(id, itemId, updates);
            await carregar(id);
        } catch (err: any) {
            console.error(err);
        }
    }, [id, carregar]);

    const removerItem = useCallback(async (itemId: string) => {
        if (!id) return;
        try {
            await api.orcamentosPro.deleteItem(id, itemId);
            await carregar(id);
        } catch (err: any) {
            console.error(err);
        }
    }, [id, carregar]);

    return {
        orcamento,
        loading,
        error,
        inicializar,
        setHeader,
        addItem,
        importItems,
        updateItem,
        removerItem,
        updateItemExplosion,
        recarregar: () => id && carregar(id)
    };
}
