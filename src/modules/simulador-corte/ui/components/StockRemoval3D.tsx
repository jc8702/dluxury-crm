import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { LayoutSimulacao, SimulationProgram, ToolDefinition } from '../../domain/types';

interface StockRemoval3DProps {
  layout: LayoutSimulacao;
  escala: number;
  tempoAtual: number;
  program: SimulationProgram;
  tool: ToolDefinition;
  mostrarStock?: boolean;
}

export default function StockRemoval3D({
  layout,
  escala,
  tempoAtual,
  program,
  tool,
  mostrarStock = true,
}: StockRemoval3DProps) {
  const sheetW = layout.chapa.largura;
  const sheetH = layout.chapa.altura;

  // Resolução do canvas (pixels por mm)
  const pxPerMm = 0.5;
  const canvasW = Math.floor(sheetW * pxPerMm);
  const canvasH = Math.floor(sheetH * pxPerMm);

  // Cria o canvas dinâmico persistente na memória
  const canvas = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = canvasW;
    c.height = canvasH;
    return c;
  }, [canvasW, canvasH]);

  const textureRef = useRef<THREE.CanvasTexture>(null);

  // Atualiza o canvas de corte com base no tempo atual
  useEffect(() => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Limpa o canvas e pinta com a cor sólida do MDF Cru
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.fillStyle = '#C49A6C'; // MDF Cru amadeirado
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Desenha bordas de gabarito para as peças (linhas finas marrons)
    ctx.strokeStyle = '#926a45';
    ctx.lineWidth = 1;
    layout.pecas.forEach((p) => {
      ctx.strokeRect(
        p.x * pxPerMm,
        p.y * pxPerMm,
        p.comprimento * pxPerMm,
        p.largura * pxPerMm
      );
    });

    // 2. Configura a operação de recorte (transparência onde a fresa passa)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = tool.diametro * pxPerMm;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,1)';

    let accTempo = 0;
    let interrompido = false;

    for (let c = 0; c < program.commands.length; c++) {
      const cmd = program.commands[c];
      const cmdDur = cmd.tempoEstimado || 0;

      if (accTempo > tempoAtual) {
        break;
      }

      if (accTempo + cmdDur <= tempoAtual) {
        // Desenha todos os segmentos deste comando que já foi totalmente concluído
        cmd.segments.forEach((s) => {
          if (s.tipo === 'cutting' || s.tipo === 'lead_in' || s.tipo === 'lead_out') {
            // Conversão: Y no Three.js do simulador é Z no percurso de profundidade (escala vertical)
            // Enquanto o plano da chapa é X (largura) e Y (profundidade de avanço)
            ctx.beginPath();
            ctx.moveTo(s.from.x * pxPerMm, s.from.y * pxPerMm);
            ctx.lineTo(s.to.x * pxPerMm, s.to.y * pxPerMm);
            ctx.stroke();
          }
        });
        accTempo += cmdDur;
      } else {
        // O comando atual foi interrompido no tempoAtual (corte progressivo parcial)
        const tempoNoCmd = tempoAtual - accTempo;
        let accSegTempo = 0;

        for (const s of cmd.segments) {
          const dx = s.to.x - s.from.x;
          const dy = s.to.y - s.from.y;
          const dz = s.to.z - s.from.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const segDur = dist / (s.velocidade / 60);

          if (accSegTempo > tempoNoCmd) {
            break;
          }

          if (s.tipo === 'cutting' || s.tipo === 'lead_in' || s.tipo === 'lead_out') {
            ctx.beginPath();
            ctx.moveTo(s.from.x * pxPerMm, s.from.y * pxPerMm);

            if (accSegTempo + segDur <= tempoNoCmd) {
              ctx.lineTo(s.to.x * pxPerMm, s.to.y * pxPerMm);
            } else {
              // Interpolação do ponto de parada
              const frac = (tempoNoCmd - accSegTempo) / (segDur || 1);
              const pxStop = s.from.x + (s.to.x - s.from.x) * frac;
              const pyStop = s.from.y + (s.to.y - s.from.y) * frac;
              ctx.lineTo(pxStop * pxPerMm, pyStop * pxPerMm);
            }
            ctx.stroke();
          }
          accSegTempo += segDur;
        }

        interrompido = true;
        break;
      }
    }

    // 3. Força a textura do Three.js a atualizar a GPU
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  }, [canvas, tempoAtual, program, tool, layout, canvasW, canvasH]);

  // Se o stock não estiver habilitado para exibição, renderiza apenas o MDF Cru plano padrão
  if (!mostrarStock) {
    return null;
  }

  const sW = sheetW / escala;
  const sD = sheetH / escala;
  const cx = sW / 2;
  const cz = sD / 2;

  // Plano do MDF superior com a textura de corte dinamicamente recortada
  return (
    <group>
      {canvas && (
        <mesh position={[cx, 0.003, cz]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <planeGeometry args={[sW, sD]} />
          <meshStandardMaterial
            roughness={0.7}
            metalness={0.0}
            transparent={true}
            side={THREE.DoubleSide}
            depthWrite={true}
          >
            <canvasTexture
              ref={textureRef}
              attach="map"
              image={canvas}
              colorSpace={THREE.SRGBColorSpace}
              minFilter={THREE.LinearFilter}
              magFilter={THREE.LinearFilter}
            />
          </meshStandardMaterial>
        </mesh>
      )}
    </group>
  );
}
