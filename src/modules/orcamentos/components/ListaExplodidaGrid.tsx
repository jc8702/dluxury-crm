import React from 'react';

interface ListaExplodidaGridProps {
    itemId: string;
    data: any[];
    onUpdate: (bomId: string, quantidadeAjustada: number) => void;
}

export function ListaExplodidaGrid({ data, onUpdate }: ListaExplodidaGridProps) {
    return (
        <div className="overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950/50">
            <table className="w-full text-xs text-left border-collapse">
                <thead>
                    <tr className="bg-zinc-900/80 text-zinc-500 uppercase tracking-widest font-black border-b border-zinc-900">
                        <th className="px-6 py-4">Componente</th>
                        <th className="px-6 py-4 text-center">Origem</th>
                        <th className="px-6 py-4 text-right" title="Quantidade exata calculada pela engenharia (BOM)">Qtd Calc.</th>
                        <th className="px-6 py-4 text-right" title="Quantidade que será enviada para o estoque/compras (incluindo sobras)">Qtd Ajustada</th>
                        <th className="px-6 py-4 text-right">Custo UN</th>
                        <th className="px-6 py-4 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                    {data.map((comp) => (
                        <tr key={comp.id} className="hover:bg-zinc-900/30 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="font-bold text-zinc-300">{comp.componente?.nome || 'N/A'}</div>
                                <div className="text-[10px] text-zinc-600 uppercase font-black">{comp.componente?.codigo}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                    comp.origem === 'BOM' ? 'bg-blue-900/20 text-blue-500 border border-blue-900/30' : 'bg-amber-900/20 text-amber-500 border border-amber-900/30'
                                }`}>
                                    {comp.origem}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right text-zinc-500 font-mono">
                                {Number(comp.quantidadeCalculada).toFixed(3)}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <input 
                                    type="number" 
                                    value={comp.quantidadeAjustada}
                                    onChange={(e) => onUpdate(comp.id, Number(e.target.value))}
                                    className={`w-24 bg-zinc-900 border ${comp.editado ? 'border-orange-500/50' : 'border-zinc-800'} rounded-lg px-3 py-1.5 text-right text-white font-bold focus:ring-2 focus:ring-orange-500/50 outline-none transition-all`}
                                />
                            </td>
                            <td className="px-6 py-4 text-right text-zinc-400 font-mono">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comp.custoUnitario)}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-white italic">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(comp.quantidadeAjustada) * Number(comp.custoUnitario))}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
