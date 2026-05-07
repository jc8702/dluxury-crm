import React from 'react';
import { useOrcamento } from '../hooks/useOrcamento';

interface ListaExplodidaGridProps {
    itemId: string;
    data: any[];
}

export function ListaExplodidaGrid({ itemId, data }: ListaExplodidaGridProps) {
    const { updateItemExplosion } = useOrcamento();

    return (
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
            <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-zinc-900 text-zinc-400">
                    <tr>
                        <th className="px-4 py-3 font-medium">Componente</th>
                        <th className="px-4 py-3 font-medium text-center">Origem</th>
                        <th className="px-4 py-3 font-medium text-right">Qtd Calc.</th>
                        <th className="px-4 py-3 font-medium text-right">Qtd Ajustada</th>
                        <th className="px-4 py-3 font-medium text-right">Custo UN</th>
                        <th className="px-4 py-3 font-medium text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {data.map((comp) => (
                        <tr key={comp.id} className="hover:bg-zinc-900/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-zinc-300">{comp.nome}</td>
                            <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    comp.origem === 'BOM' ? 'bg-blue-900/30 text-blue-400' : 'bg-amber-900/30 text-amber-400'
                                }`}>
                                    {comp.origem}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-500">{comp.quantidadeCalculada}</td>
                            <td className="px-4 py-3 text-right">
                                <input 
                                    type="number" 
                                    value={comp.quantidadeAjustada}
                                    onChange={(e) => updateItemExplosion(itemId, comp.id, { quantidadeAjustada: Number(e.target.value) })}
                                    className={`w-20 bg-zinc-900 border ${comp.editado ? 'border-orange-500/50' : 'border-zinc-800'} rounded px-2 py-1 text-right text-white focus:ring-1 focus:ring-orange-500 outline-none`}
                                />
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-300">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comp.custoUnitario)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-white">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comp.quantidadeAjustada * comp.custoUnitario)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
