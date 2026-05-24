import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { LayoutSimulacao } from '../../domain/types';

interface ToolpathPreviewProps {
  layout: LayoutSimulacao;
  escala: number;
  animando: boolean;
  velocidadeAnimacao: number;
}

const TP_COLOR = '#EF4444';
const TP_ACTIVE_COLOR = '#F97316';
const TP_COMPLETED_COLOR = '#10B981';

interface CorteSegmento {
  from: { x: number; z: number };
  to: { x: number; z: number };
  tipo: 'serra' | 'passe_livre';
}

function calcularSequenciaCorte(layout: LayoutSimulacao, escala: number): CorteSegmento[] {
  const segmentos: CorteSegmento[] = [];

  // Sort pieces by position for optimal cutting order
  const sorted = [...layout.pecas].sort((a, b) => {
    const distA = a.x + a.y;
    const distB = b.x + b.y;
    return distA - distB;
  });

  let currentPos = { x: 0, z: 0 };

  for (const peca of sorted) {
    const px = peca.x / escala;
    const pz = peca.y / escala;
    const pc = peca.comprimento / escala;
    const pl = peca.largura / escala;

    // Travel to piece start (lifted pass)
    segmentos.push({
      from: { x: currentPos.x, z: currentPos.z },
      to: { x: px, z: pz },
      tipo: 'passe_livre',
    });

    // Cut vertical edges (left + right)
    segmentos.push({
      from: { x: px, z: pz },
      to: { x: px, z: pz + pl },
      tipo: 'serra',
    });
    segmentos.push({
      from: { x: px + pc, z: pz },
      to: { x: px + pc, z: pz + pl },
      tipo: 'serra',
    });

    // Cut horizontal edges (top + bottom)
    segmentos.push({
      from: { x: px, z: pz },
      to: { x: px + pc, z: pz },
      tipo: 'serra',
    });
    segmentos.push({
      from: { x: px, z: pz + pl },
      to: { x: px + pc, z: pz + pl },
      tipo: 'serra',
    });

    currentPos = { x: px + pc, z: pz + pl };
  }

  return segmentos;
}

export default function ToolpathPreview({
  layout,
  escala,
  animando,
  velocidadeAnimacao,
}: ToolpathPreviewProps) {
  const segmentos = useMemo(
    () => calcularSequenciaCorte(layout, escala),
    [layout, escala],
  );

  const [progresso, setProgresso] = useState(0);
  const animRef = useRef<number>(0);
  const lastTime = useRef(0);

  useEffect(() => {
    if (!animando) {
      setProgresso(0);
      return;
    }

    lastTime.current = performance.now();
    let accTime = 0;
    const duracaoTotal = Math.max(1000, segmentos.length * (80 / velocidadeAnimacao));

    function animate(now: number) {
      const dt = now - lastTime.current;
      lastTime.current = now;
      accTime += dt;
      const pct = Math.min(accTime / duracaoTotal, 1);
      setProgresso(pct);
      if (pct < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [animando, velocidadeAnimacao, segmentos.length]);

  const segmentosVisiveis = useMemo(() => {
    const total = segmentos.length;
    const ateIdx = Math.floor(progresso * total);

    return segmentos.map((seg, i) => {
      let cor: string;
      if (i < ateIdx) {
        cor = seg.tipo === 'serra' ? TP_COMPLETED_COLOR : '#374151';
      } else if (i === ateIdx && animando) {
        cor = TP_ACTIVE_COLOR;
      } else {
        cor = seg.tipo === 'serra' ? TP_COLOR : 'transparent';
      }
      const opacity = i === ateIdx && animando ? 1 : i < ateIdx ? 0.6 : seg.tipo === 'serra' ? 0.35 : 0;
      return { seg, cor, opacity, isActive: i === ateIdx && animando };
    });
  }, [segmentos, progresso, animando]);

  // Active cut head position
  const cabecaPos = useMemo(() => {
    if (!animando || segmentos.length === 0) return null;
    const total = segmentos.length;
    const idx = Math.min(Math.floor(progresso * total), total - 1);
    const seg = segmentos[idx];
    const frac = (progresso * total) - idx;
    if (!seg) return null;
    return {
      x: seg.from.x + (seg.to.x - seg.from.x) * frac,
      z: seg.from.z + (seg.to.z - seg.from.z) * frac,
    };
  }, [segmentos, progresso, animando]);

  if (segmentos.length === 0) return null;

  return (
    <group>
      {/* Linhas de corte */}
      {segmentosVisiveis.map((sv, i) => {
        if (sv.opacity === 0) return null;
        return (
          <lineSegments key={`corte-${i}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  sv.seg.from.x, 0.005, sv.seg.from.z,
                  sv.seg.to.x, 0.005, sv.seg.to.z,
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={sv.cor}
              transparent
              opacity={sv.opacity}
              linewidth={sv.isActive ? 2 : 1}
            />
          </lineSegments>
        );
      })}

      {/* Active cut head */}
      {cabecaPos && animando && (
        <mesh position={[cabecaPos.x, 0.03, cabecaPos.z]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={TP_ACTIVE_COLOR} />
        </mesh>
      )}

      {/* Serra disc indicators at each piece corner */}
      {layout.pecas.map((peca) => {
        const px = peca.x / escala;
        const pz = peca.y / escala;
        const pc = peca.comprimento / escala;
        const pl = peca.largura / escala;
        const corners = [
          [px, pz],
          [px + pc, pz],
          [px, pz + pl],
          [px + pc, pz + pl],
        ];
        return corners.map(([cx, cz], ci) => (
          <lineSegments key={`kerf-${peca.id}-${ci}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  cx - 0.03, 0.005, cz - 0.03,
                  cx + 0.03, 0.005, cz + 0.03,
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color={TP_COLOR} transparent opacity={0.2} />
          </lineSegments>
        ));
      })}
    </group>
  );
}
