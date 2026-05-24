import React from 'react';
import type { PecaSimulacao } from '../../domain/types';

interface PainelPecasRapidoProps {
  pecas: PecaSimulacao[];
  pecaSelecionada: PecaSimulacao | null;
  onSelecionar: (peca: PecaSimulacao) => void;
}

const cores = [
  '#E2AC00', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6',
  '#F97316', '#06B6D4', '#EC4899', '#84CC16', '#14B8A6',
  '#D946EF', '#F43F5E', '#0EA5E9', '#A855F7', '#22C55E',
];

export default function PainelPecasRapido({ pecas, pecaSelecionada, onSelecionar }: PainelPecasRapidoProps) {
  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
      <h3 className="text-[#E2AC00] font-bold text-sm tracking-wider mb-3">PEÇAS NO LAYOUT</h3>

      {pecas.length === 0 ? (
        <p className="text-[#6B7280] text-xs text-center py-4">NENHUMA PEÇA NO LAYOUT ATUAL</p>
      ) : (
        <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
          {pecas.map((peca, index) => {
            const isSelected = pecaSelecionada?.id === peca.id;
            const cor = cores[index % cores.length];

            return (
              <button
                key={peca.id}
                onClick={() => onSelecionar(peca)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#1F2937] border border-[#E2AC00]'
                    : 'bg-[#1F2937]/50 hover:bg-[#1F2937] border border-transparent'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: cor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{peca.nome}</p>
                  <p className="text-[#6B7280] text-[10px]">
                    {peca.largura}×{peca.altura}MM
                    {peca.rotacionada ? ' | 90°' : ''}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
