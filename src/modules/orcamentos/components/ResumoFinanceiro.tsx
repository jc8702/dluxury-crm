import React from 'react';
import { Calculator, TrendingUp, DollarSign } from 'lucide-react';

interface ResumoFinanceiroProps {
    resumo: {
        custoTotal: number;
        vendaTotal: number;
        margemReal: number;
    };
}

export function ResumoFinanceiro({ resumo }: ResumoFinanceiroProps) {
    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const margemPercentual = resumo.vendaTotal > 0 ? (resumo.margemReal / resumo.vendaTotal) * 100 : 0;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur-2xl border-t border-zinc-900 p-6 z-50">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                <div className="flex gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black text-zinc-600 tracking-widest mb-1 flex items-center gap-1">
                            <Calculator className="w-3 h-3" /> Custo Total (BOM)
                        </span>
                        <span className="text-2xl font-black text-white italic">{formatter.format(resumo.custoTotal)}</span>
                    </div>
                    
                    <div className="flex flex-col border-l border-zinc-900 pl-12">
                        <span className="text-[10px] uppercase font-black text-zinc-600 tracking-widest mb-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-500" /> Margem Realizada
                        </span>
                        <div className="flex items-baseline gap-3">
                            <span className="text-2xl font-black text-emerald-500 italic">{formatter.format(resumo.margemReal)}</span>
                            <span className="text-sm font-bold text-zinc-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                {margemPercentual.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-black text-orange-500 tracking-widest mb-1 flex items-center gap-1 justify-end">
                            <DollarSign className="w-3 h-3" /> Valor Final de Venda
                        </span>
                        <span className="text-5xl font-black text-white italic tracking-tighter drop-shadow-lg">
                            {formatter.format(resumo.vendaTotal)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
