'use client';

import React from 'react';
import { Plus, Trash2, Scissors } from 'lucide-react';
import { Peca } from '../../domain/types';

interface PainelPecasChapaProps {
  chapaId: string;
  pecas: Peca[];
  onAddPeca: () => void;
  onUpdatePeca: (pecaId: string, data: Partial<Peca>) => void;
  onRemovePeca: (pecaId: string) => void;
  onOtimizar: () => void;
  isOtimizando: boolean;
}

export function PainelPecasChapa({
  chapaId,
  pecas,
  onAddPeca,
  onUpdatePeca,
  onRemovePeca,
  onOtimizar,
  isOtimizando
}: PainelPecasChapaProps) {
  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
      <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#222]">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#888]">Peças da Chapa</h3>
        <button
          onClick={onAddPeca}
          className="w-8 h-8 rounded-lg bg-[#FFA500]/10 text-[#FFA500] hover:bg-[#FFA500]/20 flex items-center justify-center transition-all border border-[#FFA500]/20"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {pecas.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 text-center p-8">
            <Scissors size={48} className="mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest">Nenhuma peça adicionada</p>
          </div>
        ) : (
          pecas.map(p => (
            <div key={p.id} className="group bg-[#222] border border-[#333] p-4 rounded-xl hover:border-[#FFA500]/30 transition-all">
              <div className="flex justify-between items-start mb-3">
                <input
                  value={p.nome}
                  onChange={e => onUpdatePeca(p.id, { nome: e.target.value.toUpperCase() })}
                  className="bg-transparent text-sm font-bold text-white focus:outline-none w-full border-b border-transparent focus:border-[#FFA500]/50"
                  placeholder="NOME DA PEÇA"
                />
                <button
                  onClick={() => onRemovePeca(p.id)}
                  className="p-1 opacity-0 group-hover:opacity-100 text-[#888] hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/30 p-2 rounded-lg border border-[#444]">
                  <label className="text-[8px] font-black text-[#666] uppercase block mb-1">Largura</label>
                  <input
                    type="number"
                    value={p.largura}
                    onChange={e => onUpdatePeca(p.id, { largura: Number(e.target.value) })}
                    className="bg-transparent text-xs text-white font-bold w-full focus:outline-none"
                  />
                </div>
                <div className="bg-black/30 p-2 rounded-lg border border-[#444]">
                  <label className="text-[8px] font-black text-[#666] uppercase block mb-1">Altura</label>
                  <input
                    type="number"
                    value={p.altura}
                    onChange={e => onUpdatePeca(p.id, { altura: Number(e.target.value) })}
                    className="bg-transparent text-xs text-white font-bold w-full focus:outline-none"
                  />
                </div>
                <div className="bg-[#FFA500]/5 p-2 rounded-lg border border-[#FFA500]/20">
                  <label className="text-[8px] font-black text-[#FFA500]/50 uppercase block mb-1">Qtd</label>
                  <input
                    type="number"
                    value={p.quantidade || 1}
                    onChange={e => onUpdatePeca(p.id, { quantidade: Number(e.target.value) })}
                    className="bg-transparent text-xs text-[#FFA500] font-black w-full focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-[#222] border-t border-[#333]">
        <button
          onClick={onOtimizar}
          disabled={isOtimizando || pecas.length === 0}
          className="w-full h-12 rounded-xl bg-[#FF6B35] hover:bg-[#FF7F4D] text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#FF6B35]/20 disabled:opacity-30 flex items-center justify-center gap-3"
        >
          {isOtimizando ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Scissors size={18} />
          )}
          {isOtimizando ? 'Calculando...' : 'Otimizar Chapa'}
        </button>
      </div>
    </div>
  );
}

const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size || 24}
    height={size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
