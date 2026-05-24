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
    const duracaoTotal = Math.max(1000, segmentos.length * (1600 / velocidadeAnimacao));

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

      {/* Active cut head (Spindle CNC Industrial) */}
      {cabecaPos && animando && (
        <group position={[cabecaPos.x, 0.01, cabecaPos.z]}>
          {/* Luz de Trabalho do Spindle (LED apontado para o corte) */}
          <pointLight position={[0, 0.1, 0]} intensity={1.5} distance={1.2} color="#00FFFF" />
          
          {/* Broca de corte (Fresa dourada de metal duro) */}
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.16, 8]} />
            <meshStandardMaterial color="#FBBF24" emissive="#D97706" emissiveIntensity={0.2} metalness={0.9} roughness={0.1} />
          </mesh>
          
          {/* Mandril (Collet porta-fresa em Cromo Polido) */}
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.05, 12]} />
            <meshStandardMaterial color="#F3F4F6" metalness={0.95} roughness={0.05} />
          </mesh>

          {/* Anel Inferior de LED de Trabalho (Neon Ciano) */}
          <mesh position={[0, 0.19, 0]}>
            <torusGeometry args={[0.041, 0.006, 8, 20]} />
            <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={3} />
          </mesh>
          
          {/* Porca do Mandril (Preto Industrial) */}
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.03, 6]} />
            <meshStandardMaterial color="#1F2937" metalness={0.8} roughness={0.4} />
          </mesh>
          
          {/* Corpo do motor - Parte Inferior (Laranja Industrial Vibrante) */}
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.22, 16]} />
            <meshStandardMaterial color="#EA580C" metalness={0.3} roughness={0.15} />
          </mesh>

          {/* Aletas de Refrigeração Cromadas / Detalhe Central de Aço */}
          <mesh position={[0, 0.48, 0]}>
            <cylinderGeometry args={[0.078, 0.078, 0.06, 16]} />
            <meshStandardMaterial color="#E5E7EB" metalness={0.95} roughness={0.05} />
          </mesh>
          
          {/* Corpo do motor - Parte Superior (Laranja Industrial Vibrante) */}
          <mesh position={[0, 0.60, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.18, 16]} />
            <meshStandardMaterial color="#EA580C" metalness={0.3} roughness={0.15} />
          </mesh>
          
          {/* Topo do Spindle (Tampa Metálica Cromada) */}
          <mesh position={[0, 0.70, 0]}>
            <cylinderGeometry args={[0.08, 0.06, 0.03, 16]} />
            <meshStandardMaterial color="#F3F4F6" metalness={0.95} roughness={0.05} />
          </mesh>

          {/* Tampa do Cooler do Topo (Preto Industrial) */}
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.01, 16]} />
            <meshStandardMaterial color="#111827" metalness={0.8} roughness={0.5} />
          </mesh>
          
          {/* Anel de LED Superior indicativo de operação (Azul Neon) */}
          <mesh position={[0, 0.68, 0]}>
            <torusGeometry args={[0.081, 0.008, 8, 24]} />
            <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={3} />
          </mesh>
        </group>
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
