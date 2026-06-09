'use client';

import React, { useMemo } from 'react';
import { Plus, Trash2, Scissors, AlertTriangle, Layers } from 'lucide-react';
import type { Peca } from '../../domain/types';
import { Button } from '../../../../components/ui';

interface PainelPecasChapaProps {
  chapaId: string;
  pecas: Peca[];
  onAddPeca: () => void;
  onUpdatePeca: (pecaId: string, data: Partial<Peca>) => void;
  onRemovePeca: (pecaId: string) => void;
  onOtimizar: () => void;
  isOtimizando: boolean;
  larguraChapa?: number;
  alturaChapa?: number;
}

export function PainelPecasChapa({
  pecas,
  onAddPeca,
  onUpdatePeca,
  onRemovePeca,
  onOtimizar,
  isOtimizando,
  larguraChapa,
  alturaChapa,
}: PainelPecasChapaProps) {
  const areaInfo = useMemo(() => {
    if (!larguraChapa || !alturaChapa || pecas.length === 0) return null;

    const areaChapa = larguraChapa * alturaChapa;
    const areaTotalPecas = pecas.reduce((sum, p) => {
      const qtd = p.quantidade || 1;
      return sum + p.largura * p.altura * qtd;
    }, 0);

    const chapasEstimadas = Math.ceil(areaTotalPecas / areaChapa);
    const extrapolou = areaTotalPecas > areaChapa;
    const percentualArea = (areaTotalPecas / areaChapa) * 100;

    return { areaChapa, areaTotalPecas, chapasEstimadas, extrapolou, percentualArea };
  }, [pecas, larguraChapa, alturaChapa]);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#222]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#FFA500]/10 text-[#FFA500]">
            <Scissors size={20} />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FFA500]">
              Peças da Chapa
            </h3>
            <p className="text-[9px] font-mono text-[#666]">{pecas.length} itens configurados</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onAddPeca}
          className="h-9 w-9 hover:bg-[#FFA500] hover:text-black border-[#FFA500]/20 text-[#FFA500]"
          title="Adicionar Peça"
        >
          <Plus size={18} />
        </Button>
      </div>

      {/* Area Warning Bar */}
      {areaInfo && areaInfo.extrapolou && (
        <div className="px-4 py-2.5 bg-[#FFA500]/10 border-b border-[#FFA500]/20 flex items-center gap-2.5">
          <AlertTriangle size={14} className="text-[#FFA500] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-[#FFA500] uppercase tracking-wider leading-tight">
              Ãrea total das peças excede a chapa
            </p>
            <p className="text-[8px] font-mono text-[#888] mt-0.5">
              {areaInfo.areaTotalPecas.toLocaleString()} mmÂ² necessário Â·{' '}
              {areaInfo.areaChapa.toLocaleString()} mmÂ² disponível Â· ~{areaInfo.chapasEstimadas}{' '}
              chapas
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-md">
            <Layers size={10} className="text-[#FFA500]" />
            <span className="text-[10px] font-black text-[#FFA500]">
              {areaInfo.chapasEstimadas}x
            </span>
          </div>
        </div>
      )}

      {areaInfo && !areaInfo.extrapolou && pecas.length > 0 && (
        <div className="px-4 py-2 bg-white/5 border-b border-[#333]">
          <p className="text-[8px] font-mono text-[#555]">
            {areaInfo.areaTotalPecas.toLocaleString()} mmÂ² de {areaInfo.areaChapa.toLocaleString()}{' '}
            mmÂ² ({areaInfo.percentualArea.toFixed(0)}%)
          </p>
        </div>
      )}

      {/* Lista de Peças */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {pecas.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-2xl border border-dashed border-white/10 text-center">
            <p className="text-xs text-[#666] font-medium mb-4">Nenhuma peça adicionada</p>
            <Button
              onClick={onAddPeca}
              className="bg-[#FFA500] text-black hover:bg-[#FFD700] px-4 py-2 h-auto text-[10px] font-black flex items-center gap-2 uppercase tracking-wider"
            >
              <Plus size={14} /> Adicionar Primeira Peça
            </Button>
          </div>
        ) : (
          pecas.map((p) => (
            <div
              key={p.id}
              className="group bg-[#222] border border-[#333] p-4 rounded-xl hover:border-[#FFA500]/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <input
                  type="text"
                  value={p.nome}
                  onChange={(e) => onUpdatePeca(p.id, { nome: e.target.value.toUpperCase() })}
                  className="bg-transparent text-[11px] font-black text-white w-full focus:outline-none uppercase tracking-wider"
                  placeholder="NOME DA PEÃ‡A"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemovePeca(p.id)}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 size={14} />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#444] uppercase tracking-tighter">
                    Largura (mm)
                  </label>
                  <div className="bg-[#111] p-2 rounded-lg border border-[#333] flex items-center">
                    <input
                      type="number"
                      value={p.largura}
                      onChange={(e) => onUpdatePeca(p.id, { largura: Number(e.target.value) })}
                      className="bg-transparent text-xs text-[#FFA500] font-black w-full focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#444] uppercase tracking-tighter">
                    Altura (mm)
                  </label>
                  <div className="bg-[#111] p-2 rounded-lg border border-[#333] flex items-center">
                    <input
                      type="number"
                      value={p.altura}
                      onChange={(e) => onUpdatePeca(p.id, { altura: Number(e.target.value) })}
                      className="bg-transparent text-xs text-[#FFA500] font-black w-full focus:outline-none"
                    />
                  </div>
                </div>

                {/* Campo Material - Fase 2 */}
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-black text-[#444] uppercase tracking-tighter">
                    Material / Acabamento
                  </label>
                  <div className="bg-[#111] p-2 rounded-lg border border-[#333] flex items-center">
                    <input
                      type="text"
                      value={p.material || ''}
                      onChange={(e) =>
                        onUpdatePeca(p.id, { material: e.target.value.toUpperCase() })
                      }
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
                    onChange={(e) => onUpdatePeca(p.id, { quantidade: Number(e.target.value) })}
                    className="bg-[#111] border border-[#333] rounded px-2 py-1 text-[10px] font-bold text-white w-12 text-center"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer group/label">
                  <span className="text-[9px] font-black text-[#444] uppercase group-hover/label:text-[#666]">
                    Girar
                  </span>
                  <input
                    type="checkbox"
                    checked={p.rotacionavel}
                    onChange={(e) => onUpdatePeca(p.id, { rotacionavel: e.target.checked })}
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
          {areaInfo && areaInfo.extrapolou && (
            <p className="text-[8px] font-bold text-[#FFA500] uppercase tracking-wider text-center mb-2">
              A otimização distribuirá as peças em {areaInfo.chapasEstimadas} chapas
            </p>
          )}
          <Button
            onClick={onOtimizar}
            disabled={isOtimizando}
            className={`w-full py-4 h-auto font-black text-xs uppercase tracking-[0.2em] transition-all bg-[#FFA500] text-black hover:bg-[#FFD700] disabled:bg-[#333] disabled:text-[#555] shadow-[0_4px_20px_rgba(255,165,0,0.2)]`}
          >
            {isOtimizando ? 'PROCESSANDO...' : 'OTIMIZAR CORTE'}
          </Button>
        </div>
      )}
    </div>
  );
}
