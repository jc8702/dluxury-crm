import React from 'react';
import { Tag } from 'lucide-react';
import type { PecaSimulacao } from '../../domain/types';

interface PainelPecasRapidoProps {
  pecas: PecaSimulacao[];
  pecaSelecionada: PecaSimulacao | null;
  onSelecionar: (peca: PecaSimulacao) => void;
  onExportarEtiqueta?: (peca: PecaSimulacao, index: number, total: number) => void;
}

const CORES = [
  '#E2AC00',
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#8B5CF6',
  '#F97316',
  '#06B6D4',
  '#EC4899',
  '#84CC16',
  '#14B8A6',
  '#D946EF',
  '#F43F5E',
  '#0EA5E9',
  '#A855F7',
  '#22C55E',
];

export default function PainelPecasRapido({
  pecas,
  pecaSelecionada,
  onSelecionar,
  onExportarEtiqueta,
}: PainelPecasRapidoProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-accent font-bold text-sm tracking-wider mb-3">PEÇAS NO LAYOUT</h3>

      {pecas.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">
          NENHUMA PEÇA NO LAYOUT ATUAL
        </p>
      ) : (
        <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
          {pecas.map((peca, index) => {
            const isSelected = pecaSelecionada?.id === peca.id;
            const cor = CORES[index % CORES.length];

            return (
              <div
                key={peca.id}
                className={`w-full flex items-center gap-2 p-1.5 rounded-lg border transition-all duration-150 ${
                  isSelected
                    ? 'bg-muted border-accent'
                    : 'bg-muted/50 hover:bg-muted border-transparent'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelecionar(peca)}
                  className="flex-1 flex items-center gap-2.5 text-left min-w-0"
                >
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: cor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{peca.nome}</p>
                    <p className="text-muted-foreground text-sm">
                      {peca.comprimento}×{peca.largura}×{peca.espessura}MM
                      {peca.rotacionada ? ' | 90°' : ''}
                    </p>
                  </div>
                </button>
                {onExportarEtiqueta && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExportarEtiqueta(peca, index, pecas.length);
                    }}
                    className="p-2 hover:bg-muted rounded text-accent hover:text-foreground transition-all shrink-0"
                    title="Exportar etiqueta QR"
                  >
                    <Tag size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.45); border-radius: 4px; }
      `}</style>
    </div>
  );
}
