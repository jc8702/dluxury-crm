'use client';

import React from 'react';
import { X, Plus, Layers } from 'lucide-react';
import { ChapaSelecionada } from '../../domain/types';

interface AbasProps {
  chapas: ChapaSelecionada[];
  chapaAtiva: ChapaSelecionada | null;
  onSelecionarChapa: (chapaId: string) => void;
  onRemoverChapa: (chapaId: string) => void;
}

export function AbasProjetoChapaS({
  chapas,
  chapaAtiva,
  onSelecionarChapa,
  onRemoverChapa
}: AbasProps) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 border-b border-[#333] mb-6 overflow-x-auto no-scrollbar pb-1">
        {chapas.map(chapa => (
          <div
            key={chapa.id}
            onClick={() => onSelecionarChapa(chapa.id)}
            className={`flex items-center gap-3 px-6 py-3 rounded-t-xl cursor-pointer transition-all border-x border-t relative min-w-[200px] group ${
              chapaAtiva?.id === chapa.id
                ? 'bg-[#242424] border-[#444] border-b-[#242424] -mb-[1px] z-10'
                : 'bg-[#1a1a1a] border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            {/* Indicador de Status */}
            <div className={`w-2 h-2 rounded-full ${chapaAtiva?.id === chapa.id ? 'bg-[#10B981]' : 'bg-[#444]'}`} />
            
            <div className="flex flex-col overflow-hidden">
              <span className={`text-[10px] font-black uppercase tracking-widest truncate ${chapaAtiva?.id === chapa.id ? 'text-[#FFA500]' : 'text-[#888]'}`}>
                {chapa.nome_exibicao}
              </span>
              <span className="text-[8px] font-mono text-[#666] truncate">{chapa.sku_chapa}</span>
            </div>

            <button
              className="ml-auto p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onRemoverChapa(chapa.id);
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {chapas.length > 0 && (
          <button className="flex items-center gap-2 px-4 py-2 text-[#444] hover:text-[#FFA500] transition-colors">
            <Plus size={18} />
            <span className="text-[9px] font-black uppercase tracking-widest">Nova Aba</span>
          </button>
        )}
      </div>

      {chapas.length === 0 && (
        <div className="flex flex-col items-center justify-center p-16 bg-[#242424]/30 border-2 border-dashed border-[#333] rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
            <Layers size={32} className="text-[#444]" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[#666]">Nenhuma chapa ativa</h3>
          <p className="text-xs text-[#444] mt-2 font-medium">Use a busca acima ou importe um PDF para começar o plano</p>
        </div>
      )}
    </div>
  );
}
