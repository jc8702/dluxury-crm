'use client';

import React from 'react';
import { CanvasAvancado } from './CanvasAvancado';
import type { ChapaSelecionada, ResultadoOtimizacaoPorChapa } from '../../domain/types';
import { Box } from 'lucide-react';

interface CanvasComAbasProps {
  chapaAtiva: ChapaSelecionada | null;
  resultado?: ResultadoOtimizacaoPorChapa;
}

export function CanvasComAbas({ chapaAtiva, resultado }: CanvasComAbasProps) {
  if (!chapaAtiva) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] text-[#333] border border-[#222] rounded-3xl min-h-[500px]">
        <Box size={64} className="mb-6 opacity-20" />
        <h3 className="text-sm font-black uppercase tracking-[0.4em] opacity-40">Aguardando Seleção de Chapa</h3>
      </div>
    );
  }

  // Layout default se não houver resultado
  const defaultLayout = { 
    pecas_posicionadas: [], 
    sobra_retalhos: [] 
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] rounded-3xl overflow-hidden border border-[#222]">
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
             <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-1">Aproveitamento</span>
              <span className="text-xl font-black text-[#10B981] italic">{resultado.aproveitamento_percentual.toFixed(1)}%</span>
            </div>
             <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-1">Peças</span>
              <span className="text-xl font-black text-white italic">{resultado.layouts[0]?.pecas_posicionadas.length || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative min-h-[500px]">
        <CanvasAvancado
          layout={resultado?.layouts[0] || defaultLayout}
          chapaDimensoes={{ largura: chapaAtiva.largura_mm, altura: chapaAtiva.altura_mm }}
        />
      </div>
    </div>
  );
}
