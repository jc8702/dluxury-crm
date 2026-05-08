'use client';

import React from 'react';
import type { Chapa } from '../../infrastructure/repositories/ChapaRepository';

interface CardChapaProps {
  chapa: Chapa;
  onAdicionar: () => void;
  jaAdicionada: boolean;
}

export function CardChapa({ chapa, onAdicionar, jaAdicionada }: CardChapaProps) {
  return (
    <div className="bg-[#242424] border border-[#404040] rounded-lg overflow-hidden transition-all hover:border-[#FFA500] hover:shadow-[0_4px_12px_rgba(255,165,0,0.2)] flex items-center p-3 gap-4">
      {/* Imagem Compacta */}
      <div className="w-16 h-16 bg-[#1a1a1a] rounded flex items-center justify-center text-2xl flex-shrink-0">
        {chapa.imagem_url ? (
          <img src={chapa.imagem_url} alt={chapa.material} className="w-full h-full object-cover rounded" />
        ) : (
          <span role="img" aria-label="board">📦</span>
        )}
      </div>
+
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h4 className="m-0 text-sm font-bold text-[#FFA500] uppercase truncate pr-2">
            {chapa.material}
          </h4>
          <span className="text-[10px] font-bold text-[#10B981] whitespace-nowrap">R$ {chapa.preco.toFixed(0)}</span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#888] mb-2">
          <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{chapa.espessura}MM</span>
          <span>{chapa.largura}×{chapa.altura} mm</span>
        </div>

        <button
          className={`w-full py-1.5 rounded font-black transition-all text-[9px] uppercase tracking-widest ${
            jaAdicionada 
              ? 'bg-[#404040] text-[#888] cursor-not-allowed' 
              : 'bg-[#FFA500]/10 text-[#FFA500] border border-[#FFA500]/20 hover:bg-[#FFA500] hover:text-black'
          }`}
          onClick={onAdicionar}
          disabled={jaAdicionada}
        >
          {jaAdicionada ? 'ADICIONADA' : 'USAR CHAPA'}
        </button>
      </div>
    </div>

  );
}
