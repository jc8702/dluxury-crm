'use client';

import React from 'react';
import { Chapa } from '../../infrastructure/repositories/ChapaRepository';

interface CardChapaProps {
  chapa: Chapa;
  onAdicionar: () => void;
  jaAdicionada: boolean;
}

export function CardChapa({ chapa, onAdicionar, jaAdicionada }: CardChapaProps) {
  return (
    <div className="bg-[#242424] border border-[#404040] rounded-lg overflow-hidden transition-all hover:border-[#FFA500] hover:shadow-[0_4px_12px_rgba(255,165,0,0.2)] flex flex-col h-full">
      {/* Imagem */}
      <div className="aspect-square bg-[#1a1a1a] flex items-center justify-center text-5xl">
        {chapa.imagem_url ? (
          <img src={chapa.imagem_url} alt={chapa.material} className="w-full h-full object-cover" />
        ) : (
          <span role="img" aria-label="board">📦</span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <h4 className="m-0 mb-2 text-base font-semibold text-[#FFA500] uppercase truncate">
          {chapa.material} {chapa.espessura}MM
        </h4>

        <p className="m-0 text-xs text-[#888] font-mono">{chapa.sku}</p>

        <div className="my-2 text-[13px] text-[#ccc] flex items-center gap-1">
          <span>📐 {chapa.largura} × {chapa.altura} mm</span>
        </div>

        <div className="mt-auto flex items-baseline gap-2 mb-4">
          <span className="text-lg font-bold text-[#10B981]">R$ {chapa.preco.toFixed(2)}</span>
          <span className="text-xs text-[#888]">por unidade</span>
        </div>

        {/* Botão */}
        <button
          className={`w-full p-3 rounded font-bold transition-all text-xs uppercase tracking-wider ${
            jaAdicionada 
              ? 'bg-[#404040] text-[#888] cursor-not-allowed' 
              : 'bg-[#FF6B35] text-white cursor-pointer hover:bg-[#FF7F4D]'
          }`}
          onClick={onAdicionar}
          disabled={jaAdicionada}
        >
          {jaAdicionada ? '✅ JÁ ADICIONADA' : '➕ USAR CHAPA'}
        </button>
      </div>
    </div>
  );
}
