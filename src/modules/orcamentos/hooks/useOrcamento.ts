import { useState, useCallback, useEffect } from 'react';

// Singleton state for simple global access without zustand
let globalState: any = {
    header: {
        clienteId: '',
        margemLucroPercentual: 30,
        taxaFinanceiraPercentual: 0,
        descontoPercentual: 0,
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

        const margem = 1 + (globalState.header.margemLucroPercentual / 100);
        const taxa = 1 + (globalState.header.taxaFinanceiraPercentual / 100);
        const desc = 1 - (globalState.header.descontoPercentual / 100);

        const vendaTotal = (custoTotal * margem * taxa * desc);

        globalState.resumo = { 
            custoTotal, 
            vendaTotal, 
            margemReal: vendaTotal - custoTotal 
        };
        notify();
    }, []);

    const setHeader = useCallback((header: any) => {
        globalState.header = header;
        calcularTotais();
    }, [calcularTotais]);

    const addItem = useCallback((item: any) => {
        globalState.itens = [...globalState.itens, item];
        calcularTotais();
    }, [calcularTotais]);

    const removeItem = useCallback((id: string) => {
        globalState.itens = globalState.itens.filter((i: any) => i.id !== id);
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

    return {
        ...state,
        setHeader,
        addItem,
        removeItem,
        updateItemExplosion,
        calcularTotais
    };
}
