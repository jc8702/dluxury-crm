'use client';

import React from 'react';
import { X, Plus, Layers } from 'lucide-react';
import type { ChapaSelecionada } from '../../domain/types';

interface AbasProps {
  chapas: ChapaSelecionada[];
  chapaAtiva: ChapaSelecionada | null;
  onSelecionarChapa: (chapaId: string) => void;
  onRemoverChapa: (chapaId: string) => void;
  onNovaAba?: () => void;
}

export function AbasProjetoChapaS({
  chapas,
  chapaAtiva,
  onSelecionarChapa,
  onRemoverChapa,
  onNovaAba
}: AbasProps) {
  return (
    <div className="w-full flex flex-col gap-2">
      {chapas.map(chapa => (
        <div
          key={chapa.id}
          onClick={() => onSelecionarChapa(chapa.id)}
          className={`flex items-center gap-4 px-4 py-4 rounded-2xl cursor-pointer transition-all border relative group ${
            chapaAtiva?.id === chapa.id
              ? 'bg-[#FFA500]/10 border-[#FFA500]/30 shadow-lg shadow-[#FFA500]/5 text-[#FFA500]'
              : 'bg-card border-border hover:border-border/80 opacity-60 hover:opacity-100 text-foreground'
          }`}
        >
          {/* Indicador de Status Lateral */}
          <div className={`w-1 self-stretch rounded-full ${chapaAtiva?.id === chapa.id ? 'bg-[#FFA500]' : 'bg-muted-foreground/30'}`} />
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-black uppercase tracking-widest truncate ${chapaAtiva?.id === chapa.id ? 'text-[#FFA500]' : 'text-muted-foreground'}`}>
                {chapa.nome_exibicao}
              </span>
              <div className="px-2 py-0.5 rounded bg-muted border border-border text-[8px] font-mono text-muted-foreground">
                {chapa.espessura_mm}mm
              </div>
            </div>
            <span className="text-[9px] font-mono text-muted-foreground truncate mt-1">{chapa.sku_chapa}</span>
          </div>

          <button
            className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onRemoverChapa(chapa.id);
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}

      {onNovaAba && (
        <button 
          onClick={onNovaAba}
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl border border-dashed border-border text-muted-foreground hover:text-[#FFA500] hover:border-[#FFA500]/30 hover:bg-[#FFA500]/5 transition-all group mt-2"
        >
          <Plus size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Adicionar Novo Material</span>
        </button>
      )}

      {chapas.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-3xl text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Layers size={24} className="text-muted-foreground" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Nenhum material</h3>
          <p className="text-[9px] text-muted-foreground mt-1 uppercase font-black">Busque por SKU para iniciar</p>
        </div>
      )}
    </div>
  );
}
