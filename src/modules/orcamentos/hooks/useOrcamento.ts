import { create } from 'zustand';

interface OrcamentoState {
    header: any;
    itens: any[];
    resumo: {
        custoTotal: number;
        vendaTotal: number;
        margemReal: number;
    };
    setHeader: (header: any) => void;
    addItem: (sku: any) => void;
    removeItem: (itemId: string) => void;
    updateItemExplosion: (itemId: string, componentId: string, updates: any) => void;
    calcularTotais: () => void;
}

export const useOrcamento = create<OrcamentoState>((set, get) => ({
    header: {
        clienteId: '',
        margemLucroPercentual: 30,
        taxaFinanceiraPercentual: 0,
        descontoPercentual: 0,
    },
    itens: [],
    resumo: { custoTotal: 0, vendaTotal: 0, margemReal: 0 },

    setHeader: (header) => {
        set({ header });
        get().calcularTotais();
    },

    addItem: (item) => {
        set((state) => ({ itens: [...state.itens, item] }));
        get().calcularTotais();
    },

    removeItem: (id) => {
        set((state) => ({ itens: state.itens.filter(i => i.id !== id) }));
        get().calcularTotais();
    },

    updateItemExplosion: (itemId, componentId, updates) => {
        set((state) => ({
            itens: state.itens.map(item => {
                if (item.id === itemId) {
                    return {
                        ...item,
                        listaExplodida: item.listaExplodida.map((comp: any) => 
                            comp.id === componentId ? { ...comp, ...updates, editado: true } : comp
                        )
                    };
                }
                return item;
            })
        }));
        get().calcularTotais();
    },

    calcularTotais: () => {
        const { itens, header } = get();
        let custoTotal = 0;

        itens.forEach(item => {
            const custoItem = item.listaExplodida?.reduce((sum: number, c: any) => 
                sum + (Number(c.quantidadeAjustada) * Number(c.custoUnitario)), 0) || 0;
            custoTotal += custoItem * Number(item.quantidade);
        });

        const margem = 1 + (header.margemLucroPercentual / 100);
        const taxa = 1 + (header.taxaFinanceiraPercentual / 100);
        const desc = 1 - (header.descontoPercentual / 100);

        const vendaTotal = (custoTotal * margem * taxa * desc);

        set({ resumo: { 
            custoTotal, 
            vendaTotal, 
            margemReal: vendaTotal - custoTotal 
        }});
    }
}));
