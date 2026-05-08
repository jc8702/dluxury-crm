'use client';

import React from 'react';
import { Plus, Trash2, Scissors } from 'lucide-react';
import type { Peca } from '../../domain/types';

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
      {/* Header */}
      <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#222]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#FFA500]/10 text-[#FFA500]">
            <Scissors size={20} />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FFA500]">Peças da Chapa</h3>
            <p className="text-[9px] font-mono text-[#666]">{pecas.length} itens configurados</p>
          </div>
        </div>
        <button
          onClick={onAddPeca}
          className="p-2 rounded-lg bg-[#FFA500]/10 text-[#FFA500] hover:bg-[#FFA500] hover:text-black transition-all border border-[#FFA500]/20"
          title="Adicionar Peça"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Lista de Peças */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {pecas.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-2xl border border-dashed border-white/10 text-center">
            <p className="text-xs text-[#666] font-medium mb-4">Nenhuma peça adicionada</p>
            <button
              onClick={onAddPeca}
              className="px-4 py-2 bg-[#FFA500] text-black text-[10px] font-black rounded-lg hover:bg-[#FFD700] transition-all flex items-center gap-2 uppercase tracking-wider"
            >
              <Plus size={14} /> Adicionar Primeira Peça
            </button>
          </div>
        ) : (
          pecas.map(p => (
            <div key={p.id} className="group bg-[#222] border border-[#333] p-4 rounded-xl hover:border-[#FFA500]/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <input
                  type="text"
                  value={p.nome}
                  onChange={e => onUpdatePeca(p.id, { nome: e.target.value.toUpperCase() })}
                  className="bg-transparent text-[11px] font-black text-white w-full focus:outline-none uppercase tracking-wider"
                  placeholder="NOME DA PEÇA"
                />
                <button
                  onClick={() => onRemovePeca(p.id)}
                  className="p-1.5 text-[#444] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#444] uppercase tracking-tighter">Largura (mm)</label>
                  <div className="bg-[#111] p-2 rounded-lg border border-[#333] flex items-center">
                    <input
                      type="number"
                      value={p.largura}
                      onChange={e => onUpdatePeca(p.id, { largura: Number(e.target.value) })}
                      className="bg-transparent text-xs text-[#FFA500] font-black w-full focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#444] uppercase tracking-tighter">Altura (mm)</label>
                  <div className="bg-[#111] p-2 rounded-lg border border-[#333] flex items-center">
                    <input
                      type="number"
                      value={p.altura}
                      onChange={e => onUpdatePeca(p.id, { altura: Number(e.target.value) })}
                      className="bg-transparent text-xs text-[#FFA500] font-black w-full focus:outline-none"
                    />
                  </div>
                </div>
                
                {/* Campo Material - Fase 2 */}
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-black text-[#444] uppercase tracking-tighter">Material / Acabamento</label>
                  <div className="bg-[#111] p-2 rounded-lg border border-[#333] flex items-center">
                    <input
                      type="text"
                      value={p.material || ''}
                      onChange={e => onUpdatePeca(p.id, { material: e.target.value.toUpperCase() })}
                      className="bg-transparent text-[10px] text-white/50 font-bold w-full focus:outline-none uppercase"
                      placeholder="MDF BRANCO, GRAFITE, ETC."
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#333] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-[9px] font-black text-[#444] uppercase">Qtd</label>
                  <input
                    type="number"
                    value={p.quantidade || 1}
                    onChange={e => onUpdatePeca(p.id, { quantidade: Number(e.target.value) })}
                    className="bg-[#111] border border-[#333] rounded px-2 py-1 text-[10px] font-bold text-white w-12 text-center"
                  />
                </div>
                
                <label className="flex items-center gap-2 cursor-pointer group/label">
                  <span className="text-[9px] font-black text-[#444] uppercase group-hover/label:text-[#666]">Girar</span>
                  <input
                    type="checkbox"
                    checked={p.rotacionavel}
                    onChange={e => onUpdatePeca(p.id, { rotacionavel: e.target.checked })}
                    className="w-3 h-3 accent-[#FFA500]"
                  />
                </label>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer com Ação */}
      {pecas.length > 0 && (
        <div className="p-4 bg-[#222] border-t border-[#333]">
          <button
            onClick={onOtimizar}
            disabled={isOtimizando}
            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all ${
              isOtimizando 
                ? 'bg-[#333] text-[#555] cursor-not-allowed'
                : 'bg-[#FFA500] text-black hover:bg-[#FFD700] shadow-[0_4px_20px_rgba(255,165,0,0.2)]'
            }`}
          >
            {isOtimizando ? 'PROCESSANDO...' : 'OTIMIZAR CORTE'}
          </button>
        </div>
      )}
    </div>
  );
}
