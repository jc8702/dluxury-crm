import React, { useMemo } from 'react';
import type { SimulationProgram } from '../../domain/types';

interface ToolpathPreviewProps {
  program: SimulationProgram;
  tempoAtual: number;
  mostrarCaminho: boolean;
}

// CORES INDUSTRIAIS DO TOOLPATH (Padrão CAM)
const COR_RAPIDO = '#4B5563';       // Cinza médio tracejado para G00
const COR_MERGULHO = '#F97316';     // Laranja para mergulhos e retração (Z vertical)
const COR_CORTE = '#EF4444';        // Vermelho para corte linear (G01)
const COR_LEAD = '#E2AC00';         // Amarelo para lead-in/lead-out suaves
const COR_CONCLUIDO = '#10B981';    // Verde para indicar caminhos já usinados

export default function ToolpathPreview({
  program,
  tempoAtual,
  mostrarCaminho,
}: ToolpathPreviewProps) {
  
  // Se o percurso estiver desabilitado, não renderiza nada
  if (!mostrarCaminho) {
    return null;
  }

  // Mapeia e divide os segmentos do SimulationProgram para renderização
  const segmentosRender = useMemo(() => {
    const list: {
      from: [number, number, number];
      to: [number, number, number];
      cor: string;
      opacidade: number;
      espessura: number;
    }[] = [];

    let accTempo = 0;

    for (let c = 0; c < program.commands.length; c++) {
      const cmd = program.commands[c];
      const cmdDur = cmd.tempoEstimado || 0;

      const concluidoTotalmente = accTempo + cmdDur <= tempoAtual;
      const emAndamento = accTempo <= tempoAtual && accTempo + cmdDur > tempoAtual;

      // Se o comando ainda não foi iniciado no tempoAtual
      if (accTempo > tempoAtual) {
        // Renderiza com opacidade baixa e cor nominal para o operador ver o percurso futuro
        cmd.segments.forEach((s) => {
          let cor = COR_CORTE;
          if (s.tipo === 'rapid') cor = COR_RAPIDO;
          else if (s.tipo === 'plunge' || s.tipo === 'retract' || s.tipo === 'safe_move') cor = COR_MERGULHO;
          else if (s.tipo === 'lead_in' || s.tipo === 'lead_out') cor = COR_LEAD;

          list.push({
            from: [s.from.x, s.from.z, s.from.y], // Converte para o referencial XYZ do R3F
            to: [s.to.x, s.to.z, s.to.y],
            cor,
            opacidade: 0.15,
            espessura: 1,
          });
        });
      } else if (concluidoTotalmente) {
        // Comando totalmente executado e cortado
        cmd.segments.forEach((s) => {
          const cor = s.tipo === 'cutting' || s.tipo === 'lead_in' || s.tipo === 'lead_out'
            ? COR_CONCLUIDO
            : COR_RAPIDO;

          list.push({
            from: [s.from.x, s.from.z, s.from.y],
            to: [s.to.x, s.to.z, s.to.y],
            cor,
            opacidade: 0.45,
            espessura: s.tipo === 'cutting' ? 2 : 1,
          });
        });
      } else if (emAndamento) {
        // Comando sendo usinado neste exato milissegundo!
        const tempoNoCmd = tempoAtual - accTempo;
        let accSegTempo = 0;

        cmd.segments.forEach((s) => {
          const dx = s.to.x - s.from.x;
          const dy = s.to.y - s.from.y;
          const dz = s.to.z - s.from.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const segDur = dist / (s.velocidade / 60);

          let cor = COR_CORTE;
          if (s.tipo === 'rapid') cor = COR_RAPIDO;
          else if (s.tipo === 'plunge' || s.tipo === 'retract' || s.tipo === 'safe_move') cor = COR_MERGULHO;
          else if (s.tipo === 'lead_in' || s.tipo === 'lead_out') cor = COR_LEAD;

          if (accSegTempo > tempoNoCmd) {
            // Segmento futuro deste comando ativo
            list.push({
              from: [s.from.x, s.from.z, s.from.y],
              to: [s.to.x, s.to.z, s.to.y],
              cor,
              opacidade: 0.15,
              espessura: 1,
            });
          } else if (accSegTempo + segDur <= tempoNoCmd) {
            // Segmento concluído deste comando ativo
            const concluidoCor = s.tipo === 'cutting' || s.tipo === 'lead_in' || s.tipo === 'lead_out'
              ? COR_CONCLUIDO
              : COR_RAPIDO;

            list.push({
              from: [s.from.x, s.from.z, s.from.y],
              to: [s.to.x, s.to.z, s.to.y],
              cor: concluidoCor,
              opacidade: 0.7,
              espessura: 2,
            });
          } else {
            // Segmento ativo sendo usinado no momento exato (interpolado)
            const frac = (tempoNoCmd - accSegTempo) / (segDur || 1);
            const stopX = s.from.x + (s.to.x - s.from.x) * frac;
            const stopY = s.from.y + (s.to.y - s.from.y) * frac;
            const stopZ = s.from.z + (s.to.z - s.from.z) * frac;

            // Parte concluída
            list.push({
              from: [s.from.x, s.from.z, s.from.y],
              to: [stopX, stopY, stopZ],
              cor: s.tipo === 'cutting' ? COR_CONCLUIDO : COR_RAPIDO,
              opacidade: 0.9,
              espessura: 3,
            });

            // Parte futura restante
            list.push({
              from: [stopX, stopY, stopZ],
              to: [s.to.x, s.to.z, s.to.y],
              cor,
              opacidade: 0.2,
              espessura: 1,
            });
          }
          accSegTempo += segDur;
        });
      }

      accTempo += cmdDur;
    }

    return list;
  }, [program, tempoAtual]);

  return (
    <group>
      {segmentosRender.map((r, i) => (
        <lineSegments key={`tp-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                r.from[0], r.from[2], r.from[1],
                r.to[0], r.to[2], r.to[1],
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={r.cor}
            transparent
            opacity={r.opacidade}
            linewidth={r.espessura}
          />
        </lineSegments>
      ))}
    </group>
  );
}
