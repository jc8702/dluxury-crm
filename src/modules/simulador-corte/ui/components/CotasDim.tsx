import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { LayoutSimulacao, PecaSimulacao } from '../../domain/types';

interface CotasDimProps {
  layout: LayoutSimulacao;
  escala: number;
  pecaSelecionada: PecaSimulacao | null;
  cenaSize: number;
}

const DIM_COLOR = '#6B7280';
const DIM_ACTIVE_COLOR = '#E2AC00';
const DIM_EXT_OFFSET = 0.15;

export default function CotasDim({ layout, escala, pecaSelecionada, cenaSize }: CotasDimProps) {
  const sheetW = layout.chapa.largura / escala;
  const sheetD = layout.chapa.altura / escala;
  const labelScale = Math.max(0.3, Math.min(1, cenaSize * 0.04));
  const fontSize = `${Math.max(12, 16 * labelScale)}px`;

  // Cotas externas da chapa
  const sheetDims = useMemo(() => [
    {
      label: `${layout.chapa.largura}MM`,
      start: [0, DIM_EXT_OFFSET + 0.05, -0.12] as const,
      end: [sheetW, DIM_EXT_OFFSET + 0.05, -0.12] as const,
      mid: [sheetW / 2, DIM_EXT_OFFSET + 0.08, -0.12] as const,
      rot: [0, 0, 0] as const,
    },
    {
      label: `${layout.chapa.altura}MM`,
      start: [-0.12, DIM_EXT_OFFSET + 0.05, 0] as const,
      end: [-0.12, DIM_EXT_OFFSET + 0.05, sheetD] as const,
      mid: [-0.12, DIM_EXT_OFFSET + 0.08, sheetD / 2] as const,
      rot: [0, -Math.PI / 2, 0] as const,
    },
  ], [sheetW, sheetD, layout.chapa.largura, layout.chapa.altura]);

  // Cota do comprimento da peça selecionada (quando hover/selected)
  const pecaDim = useMemo(() => {
    if (!pecaSelecionada) return null;
    const pc = pecaSelecionada.comprimento / escala;
    const pl = pecaSelecionada.largura / escala;
    const px = pecaSelecionada.x / escala;
    const pz = pecaSelecionada.y / escala;
    const pe = Math.max(pecaSelecionada.espessura / escala, 0.06);
    return {
      label: `${pecaSelecionada.comprimento}×${pecaSelecionada.largura}`,
      rot: pecaSelecionada.rotacionada,
      px,
      pz,
      pc,
      pl,
      pe,
    };
  }, [pecaSelecionada, escala]);

  return (
    <group>
      {/* Sheet dimension lines */}
      {sheetDims.map((dim, i) => {
        const sx = dim.start[0], sy = dim.start[1], sz = dim.start[2];
        const ex = dim.end[0], ey = dim.end[1], ez = dim.end[2];
        return (
          <group key={`dim-${i}`}>
            {/* Main line */}
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([sx, sy, sz, ex, ey, ez])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={DIM_COLOR} transparent opacity={0.6} />
            </lineSegments>

            {/* End ticks */}
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([sx, sy - 0.05, sz, sx, sy + 0.05, sz])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={DIM_COLOR} transparent opacity={0.6} />
            </lineSegments>
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([ex, ey - 0.05, ez, ex, ey + 0.05, ez])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={DIM_COLOR} transparent opacity={0.6} />
            </lineSegments>

            {/* Label */}
            <Html position={[dim.mid[0], dim.mid[1], dim.mid[2]]} center style={{ pointerEvents: 'none' }}>
              <span style={{
                color: DIM_COLOR,
                fontSize,
                fontFamily: 'monospace',
                fontWeight: 600,
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                background: 'rgba(13,17,23,0.7)',
                padding: '1px 4px',
                borderRadius: '2px',
              }}>
                {dim.label}
              </span>
            </Html>
          </group>
        );
      })}

      {/* Piece dimension overlay on selected piece */}
      {pecaDim && (
        <group>
          {/* Width dimension on top edge */}
          <lineSegments>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  pecaDim.px, pecaDim.pe + 0.04, pecaDim.pz - 0.04,
                  pecaDim.px + pecaDim.pc, pecaDim.pe + 0.04, pecaDim.pz - 0.04,
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color={DIM_ACTIVE_COLOR} transparent opacity={0.8} />
          </lineSegments>
          {/* Height dimension on right edge */}
          <lineSegments>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  pecaDim.px + pecaDim.pc + 0.04, pecaDim.pe + 0.04, pecaDim.pz,
                  pecaDim.px + pecaDim.pc + 0.04, pecaDim.pe + 0.04, pecaDim.pz + pecaDim.pl,
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color={DIM_ACTIVE_COLOR} transparent opacity={0.8} />
          </lineSegments>

          <Html
            position={[pecaDim.px + pecaDim.pc / 2, pecaDim.pe + 0.08, pecaDim.pz + pecaDim.pl / 2]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <span style={{
              color: DIM_ACTIVE_COLOR,
              fontSize,
              fontFamily: 'monospace',
              fontWeight: 700,
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              background: 'rgba(13,17,23,0.8)',
              padding: '2px 6px',
              borderRadius: '3px',
              border: '1px solid rgba(226,172,0,0.3)',
            }}>
              {pecaDim.label}
            </span>
          </Html>
        </group>
      )}
    </group>
  );
}
