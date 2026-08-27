import React from 'react';

interface ListaExplodidaGridProps {
  itemId: string;
  data: any[];
  onUpdate: (bomId: string, quantidadeAjustada: number) => void;
}

export function ListaExplodidaGrid({ data, onUpdate }: ListaExplodidaGridProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card/50">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="bg-muted/80 text-muted-foreground uppercase tracking-widest font-black border-b border-border">
            <th className="px-6 py-4">Componente</th>
            <th className="px-6 py-4 text-center">Origem</th>
            <th
              className="px-6 py-4 text-right"
              title="Quantidade exata calculada pela engenharia (BOM)"
            >
              Qtd Calc.
            </th>
            <th
              className="px-6 py-4 text-right"
              title="Quantidade que será enviada para o estoque/compras (incluindo sobras)"
            >
              Qtd Ajustada
            </th>
            <th className="px-6 py-4 text-right">Custo UN</th>
            <th className="px-6 py-4 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((comp) => (
            <tr key={comp.id} className="hover:bg-muted/30 transition-colors group">
              <td className="px-6 py-4">
                <div className="font-bold text-foreground">{comp.componente?.nome || 'N/A'}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-black">
                  {comp.componente?.codigo}
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <span
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                    comp.origem === 'BOM'
                      ? 'bg-info/10 text-info border border-info/20'
                      : 'bg-warning/10 text-warning border border-warning/20'
                  }`}
                >
                  {comp.origem}
                </span>
              </td>
              <td className="px-6 py-4 text-right text-muted-foreground font-mono">
                {Number(comp.quantidadeCalculada).toFixed(3)}
              </td>
              <td className="px-6 py-4 text-right">
                <input
                  type="number"
                  value={comp.quantidadeAjustada}
                  onChange={(e) => onUpdate(comp.id, Number(e.target.value))}
                  className={`w-24 bg-background border ${comp.editado ? 'border-primary/50' : 'border-border'} rounded-lg px-3 py-1.5 text-right text-foreground font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all`}
                />
              </td>
              <td className="px-6 py-4 text-right text-muted-foreground font-mono">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  comp.custoUnitario,
                )}
              </td>
              <td className="px-6 py-4 text-right font-black text-foreground italic">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  Number(comp.quantidadeAjustada) * Number(comp.custoUnitario),
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
