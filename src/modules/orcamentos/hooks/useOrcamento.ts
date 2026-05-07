import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

// Singleton state
let globalState: any = {
    header: {
        clienteId: '',
        margemLucroPercentual: 30,
        taxaFinanceiraPercentual: 0,
        descontoPercentual: 0,
        validadeDias: 15
    },
    itens: [],
    resumo: { custoTotal: 0, vendaTotal: 0, margemReal: 0 }
};

let listeners: Array<(s: any) => void> = [];
const notify = () => listeners.forEach(l => l({ ...globalState }));

export function useOrcamento() {
    const [state, setState] = useState(globalState);

    useEffect(() => {
        listeners.push(setState);
        return () => {
            listeners = listeners.filter(l => l !== setState);
        };
    }, []);

    const calcularTotais = useCallback(() => {
        let custoTotal = 0;
        globalState.itens.forEach((item: any) => {
            const custoItem = item.listaExplodida?.reduce((sum: number, c: any) => 
                sum + (Number(c.quantidadeAjustada) * Number(c.custoUnitario)), 0) || 0;
            custoTotal += custoItem * Number(item.quantidade);
        });

        const margem = 1 + (Number(globalState.header.margemLucroPercentual) / 100);
        const taxa = 1 + (Number(globalState.header.taxaFinanceiraPercentual) / 100);
        const desc = 1 - (Number(globalState.header.descontoPercentual) / 100);

        const vendaTotal = (custoTotal * margem * taxa * desc);

        globalState.resumo = { 
            custoTotal, 
            vendaTotal, 
            margemReal: vendaTotal - custoTotal 
        };
        notify();
    }, []);

    const setHeader = useCallback((header: any) => {
        globalState.header = { ...globalState.header, ...header };
        calcularTotais();
    }, [calcularTotais]);

    const addItem = useCallback(async (skuId: string, skuNome: string, codigo: string) => {
        try {
            // 1. Explodir BOM via API
            const componentes = await api.orcamentosPro.explode(skuId, 1);
            
            const newItem = {
                id: Math.random().toString(36).substring(7),
                skuEngenhariaId: skuId,
                codigo,
                nome: skuNome,
                quantidade: 1,
                listaExplodida: componentes.map((c: any) => ({
                    id: Math.random().toString(36).substring(7),
                    skuComponenteId: c.skuComponenteId,
                    nome: c.nome,
                    quantidadeCalculada: c.quantidadeCalculada,
                    quantidadeAjustada: c.quantidadeCalculada,
                    custoUnitario: c.custoUnitario,
                    origem: 'BOM'
                }))
            };

            globalState.itens = [...globalState.itens, newItem];
            calcularTotais();
        } catch (err) {
            console.error('Erro ao adicionar item:', err);
        }
    }, [calcularTotais]);

    const removeItem = useCallback((id: string) => {
        globalState.itens = globalState.itens.filter((i: any) => i.id !== id);
        calcularTotais();
    }, [calcularTotais]);

    const updateItemQuantity = useCallback((itemId: string, qtd: number) => {
        globalState.itens = globalState.itens.map((item: any) => {
            if (item.id === itemId) {
                return { ...item, quantidade: qtd };
            }
            return item;
        });
        calcularTotais();
    }, [calcularTotais]);

    const updateItemExplosion = useCallback((itemId: string, componentId: string, updates: any) => {
        globalState.itens = globalState.itens.map((item: any) => {
            if (item.id === itemId) {
                return {
                    ...item,
                    listaExplodida: item.listaExplodida.map((comp: any) => 
                        comp.id === componentId ? { ...comp, ...updates, editado: true } : comp
                    )
                };
            }
            return item;
        });
        calcularTotais();
    }, [calcularTotais]);

    const salvarOrcamento = useCallback(async () => {
        try {
            const result = await api.orcamentosPro.create({
                header: {
                    clienteId: parseInt(globalState.header.clienteId),
                    margemLucroPercentual: globalState.header.margemLucroPercentual,
                    taxaFinanceiraPercentual: globalState.header.taxaFinanceiraPercentual,
                    descontoPercentual: globalState.header.descontoPercentual,
                    validadeDias: globalState.header.validadeDias
                },
                itens: globalState.itens.map((item: any) => ({
                    skuEngenhariaId: item.skuEngenhariaId,
                    quantidade: item.quantidade,
                    listaExplodida: item.listaExplodida // Opcional se a API fizer a explosão auto, mas passamos para consistência se houve edição
                }))
            });
            return result;
        } catch (err) {
            console.error('Erro ao salvar orçamento:', err);
            throw err;
        }
    }, []);

    return {
        ...state,
        setHeader,
        addItem,
        removeItem,
        updateItemQuantity,
        updateItemExplosion,
        salvarOrcamento,
        calcularTotais
    };
}
