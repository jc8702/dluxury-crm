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

    const removerItem = useCallback(async (itemId: string) => {
        // Implementar no backend se necessário, por ora mock ou simplificado
        console.log('Remover item', itemId);
    }, []);

    return {
        orcamento,
        loading,
        error,
        inicializar,
        setHeader,
        addItem,
        removerItem,
        updateItemExplosion,
        recarregar: () => id && carregar(id)
    };
}
