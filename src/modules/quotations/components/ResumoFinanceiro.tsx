import React from 'react';
import { Calculator, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency, calculateMargin } from '../../../utils/calculations';

interface ResumoFinanceiroProps {
  resumo: {
    custoTotal: number;
    vendaTotal: number;
    margemReal: number;
  };
}

export function ResumoFinanceiro({ resumo }: ResumoFinanceiroProps) {
  const margemPercentual = calculateMargin(resumo.margemReal, resumo.vendaTotal);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-2xl border-t border-border p-6 z-50">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        <div className="flex gap-12">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1 flex items-center gap-1">
              <Calculator className="w-3 h-3" /> Custo Total (BOM)
            </span>
            <span className="text-2xl font-black text-foreground italic">
              {formatCurrency(resumo.custoTotal)}
            </span>
          </div>

          <div className="flex flex-col border-l border-border pl-12">
            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-success" /> Margem Realizada
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-black text-success italic">
                {formatCurrency(resumo.margemReal)}
              </span>
              <span className="text-sm font-bold text-success bg-success/10 px-2 py-0.5 rounded border border-success/20">
                {margemPercentual.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-black text-primary tracking-widest mb-1 flex items-center gap-1 justify-end">
              <DollarSign className="w-3 h-3" /> Valor Final de Venda
            </span>
            <span className="text-5xl font-black text-foreground italic tracking-tighter drop-shadow-sm">
              {formatCurrency(resumo.vendaTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
