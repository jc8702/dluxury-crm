'use client';

import React, { useState } from 'react';
import { CanvasAvancado } from './CanvasAvancado';
import type { ChapaSelecionada, ResultadoOtimizacaoPorChapa } from '../../domain/types';
import { Box, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

interface CanvasComAbasProps {
  chapaAtiva: ChapaSelecionada | null;
  resultado?: ResultadoOtimizacaoPorChapa;
}

export function CanvasComAbas({ chapaAtiva, resultado }: CanvasComAbasProps) {
  const [layoutIndex, setLayoutIndex] = useState(0);

  const totalLayouts = resultado?.layouts?.length || 0;
  const layoutAtual = resultado?.layouts?.[layoutIndex] || null;
  const chapasNecessarias = resultado?.chapas_necessarias || 1;
  const extrapolou = chapasNecessarias > 1;
  const pecasRejeitadas = resultado?.pecas_rejeitadas || [];
  const totalPecas = resultado?.pecas_total_count || 0;
  const pecasPosicionadasAgora = resultado?.layouts?.reduce((s, l) => s + l.pecas_posicionadas.length, 0) || 0;

  React.useEffect(() => {
    setLayoutIndex(0);
  }, [resultado]);

  if (!chapaAtiva) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] text-[#333] border border-[#222] rounded-3xl min-h-[500px]">
        <Box size={64} className="mb-6 opacity-20" />
        <h3 className="text-sm font-black uppercase tracking-[0.4em] opacity-40">Aguardando Seleção de Chapa</h3>
      </div>
    );
  }

  const defaultLayout = { 
    pecas_posicionadas: [], 
    sobra_retalhos: [] 
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] rounded-3xl overflow-hidden border border-[#222]">
      {/* Warn Banner - Extrapolation */}
      {extrapolou && (
        <div className="px-8 py-3 bg-[#FFA500]/10 border-b border-[#FFA500]/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertTriangle size={16} className="text-[#FFA500] flex-shrink-0" />
          <span className="text-[11px] font-bold text-[#FFA500] uppercase tracking-wider">
            Extrapolação: {chapasNecessarias} chapas necessárias ({pecasPosicionadasAgora} peças alocadas{pecasRejeitadas.length > 0 ? `, ${pecasRejeitadas.length} não couberam` : ''})
          </span>
        </div>
      )}

      {/* Header Info */}
      <div className="px-8 py-6 border-b border-[#222] flex items-center justify-between bg-[#111]">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-1">Material Ativo</span>
            <span className="text-sm font-black text-[#FFA500] uppercase tracking-wider">{chapaAtiva.nome_exibicao}</span>
          </div>
          <div className="w-px h-8 bg-[#222]" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-1">Dimensões Chapa</span>
            <span className="text-xs font-bold text-white font-mono">{chapaAtiva.largura_mm} × {chapaAtiva.altura_mm} mm</span>
          </div>
        </div>

        {resultado && (
          <div className="flex items-center gap-8">
            {totalLayouts > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLayoutIndex(Math.max(0, layoutIndex - 1))}
                  disabled={layoutIndex === 0}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[10px] font-black text-[#888] uppercase tracking-wider min-w-[60px] text-center">
                  Chapa {layoutIndex + 1}/{totalLayouts}
                </span>
                <button
                  onClick={() => setLayoutIndex(Math.min(totalLayouts - 1, layoutIndex + 1))}
                  disabled={layoutIndex === totalLayouts - 1}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-1">
                {totalLayouts > 1 ? `Aproveitamento (Chapa ${layoutIndex + 1})` : 'Aproveitamento'}
              </span>
              <span className={`text-xl font-black italic ${extrapolou ? 'text-[#FFA500]' : 'text-[#10B981]'}`}>
                {layoutAtual ? layoutAtual.aproveitamento_percentual.toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-1">Peças</span>
              <span className="text-xl font-black text-white italic">
                {layoutAtual?.pecas_posicionadas.length || 0}
                {totalLayouts > 1 && <span className="text-[#666] text-sm ml-1">/ {pecasPosicionadasAgora}</span>}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative min-h-[500px]">
        <CanvasAvancado
          layout={layoutAtual || defaultLayout}
          chapaDimensoes={{ largura: chapaAtiva.largura_mm, altura: chapaAtiva.altura_mm }}
          key={layoutIndex}
        />
      </div>
    </div>
  );
}
