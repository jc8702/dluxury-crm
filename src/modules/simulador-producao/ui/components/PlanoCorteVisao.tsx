import type { ProductionPieceInput } from '../../domain/types';
import { formatEdgePattern } from '../../domain/productionEngine';

interface Props {
  pieces: ProductionPieceInput[];
}

export default function PlanoCorteVisao({ pieces }: Props) {
  if (pieces.length === 0) {
    return (
      <div className="text-center text-[#6B7280] text-sm py-8">
        Nenhuma peça para exibir.
      </div>
    );
  }

  // Find max dimension for proportional sizing
  const maxDim = Math.max(
    ...pieces.map((p) => Math.max(p.largura, p.altura)),
    1,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {pieces.map((piece, index) => {
        const wPct = Math.max(20, (piece.largura / maxDim) * 100);
        const hPct = Math.max(20, (piece.altura / maxDim) * 100);

        return (
          <div
            key={piece.id}
            className="rounded-xl border border-[#1F2937] bg-[#0D1117] p-3 flex flex-col items-center gap-2"
          >
            <span className="text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold self-start">
              #{index + 1}
            </span>

            {/* Proportional piece drawing */}
            <div
              className="relative flex-shrink-0"
              style={{ width: `${wPct}%`, maxWidth: 140, aspectRatio: `${piece.largura} / ${piece.altura}` }}
            >
              {/* Base fill */}
              <div className="absolute inset-0 rounded-sm bg-[#1E293B]" />

              {/* Edge banding indicators */}
              {piece.fio_de_fita?.topo && (
                <div className="absolute -top-[3px] left-0 right-0 h-[5px] rounded-sm bg-[#E2AC00]" />
              )}
              {piece.fio_de_fita?.baixo && (
                <div className="absolute -bottom-[3px] left-0 right-0 h-[5px] rounded-sm bg-[#E2AC00]" />
              )}
              {piece.fio_de_fita?.esquerda && (
                <div className="absolute -left-[3px] top-0 bottom-0 w-[5px] rounded-sm bg-[#E2AC00]" />
              )}
              {piece.fio_de_fita?.direita && (
                <div className="absolute -right-[3px] top-0 bottom-0 w-[5px] rounded-sm bg-[#E2AC00]" />
              )}

              {/* Dimension label in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-bold text-[#9CA3AF] leading-tight text-center px-1">
                  {piece.largura}×{piece.altura}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="w-full text-center mt-1">
              <div className="text-[11px] font-bold text-white truncate w-full" title={piece.nome}>
                {piece.nome}
              </div>
              <div className="text-[10px] text-[#6B7280]">
                {(piece.quantidade ?? 1) > 1 ? `${piece.quantidade}x — ` : ''}
                {formatEdgePattern(piece.fio_de_fita) || 'sem fita'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
