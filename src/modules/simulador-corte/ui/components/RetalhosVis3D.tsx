import React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { LayoutSimulacao } from '../../domain/types';

interface RetalhosVis3DProps {
  layout: LayoutSimulacao;
  escala: number;
  cenaSize: number;
}

const R_BORDER = '#10B981';
const THRESHOLD_MM2 = 300 * 300; // 300×300 min for retalho inventory

export default function RetalhosVis3D({ layout, escala, cenaSize }: RetalhosVis3DProps) {
  const labelScale = Math.max(0.3, Math.min(1, cenaSize * 0.04));
  const fontSize = `${Math.max(10, 12 * labelScale)}px`;

  // Calculate free spaces from gaps between pieces
  const espacos = React.useMemo(() => {
    const sheetW = layout.chapa.largura;
    const sheetH = layout.chapa.altura;
    const results: { x: number; y: number; w: number; h: number; area: number }[] = [];

    // Collect all piece rects + sheet bounds
    const occupied = layout.pecas.map(p => ({
      x: p.x,
      y: p.y,
      w: p.comprimento,
      h: p.largura,
    }));

    // Scan left-to-right, bottom-to-top for gaps (simplified greedy scan)
    const step = 50; // scan resolution in mm
    const visited = new Set<string>();

    for (let y = 15; y < sheetH - 15; y += step) {
      for (let x = 15; x < sheetW - 15; x += step) {
        const key = `${Math.floor(x / 50)},${Math.floor(y / 50)}`;
        if (visited.has(key)) continue;

        // Check if this point is inside any piece
        let inside = false;
        for (const o of occupied) {
          if (x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h) {
            inside = true;
            break;
          }
        }
        if (inside) continue;

        // Found free space, expand rect
        let maxW = sheetW - 15 - x;
        let maxH = sheetH - 15 - y;

        // Shrink to nearest piece edge horizontally
        for (const o of occupied) {
          if (o.y < y + maxH && o.y + o.h > y) {
            if (o.x > x) maxW = Math.min(maxW, o.x - x);
          }
        }
        // Shrink vertically
        for (const o of occupied) {
          if (o.x < x + maxW && o.x + o.w > x) {
            if (o.y > y) maxH = Math.min(maxH, o.y - y);
          }
        }

        const area = maxW * maxH;
        if (area >= THRESHOLD_MM2) {
          results.push({ x, y, w: maxW, h: maxH, area });
          // Mark visited
          for (let dy = y; dy < y + maxH; dy += 50) {
            for (let dx = x; dx < x + maxW; dx += 50) {
              visited.add(`${Math.floor(dx / 50)},${Math.floor(dy / 50)}`);
            }
          }
        }
      }
    }

    return results;
  }, [layout]);

  return (
    <group>
      {espacos.map((esp, i) => {
        const ex = esp.x / escala;
        const ez = esp.y / escala;
        const ew = esp.w / escala;
        const ed = esp.h / escala;
        const areaM2 = (esp.area / 1e6).toFixed(2);

        return (
          <group key={`retalho-${i}`}>
            {/* Fill */}
            <mesh position={[ex + ew / 2, 0.002, ez + ed / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
              <planeGeometry args={[ew - 0.02, ed - 0.02]} />
              <meshBasicMaterial
                color="#10B981"
                transparent
                opacity={0.12}
                depthWrite={false}
              />
            </mesh>

            {/* Border */}
            <lineSegments position={[ex + ew / 2, 0.003, ez + ed / 2]}>
              <edgesGeometry args={[new THREE.BoxGeometry(ew - 0.02, 0.002, ed - 0.02)]} />
              <lineBasicMaterial color={R_BORDER} transparent opacity={0.45} />
            </lineSegments>

            {/* Dashed inner border */}
            <lineSegments position={[ex + ew / 2, 0.004, ez + ed / 2]}>
              <edgesGeometry args={[new THREE.BoxGeometry(ew - 0.06, 0.002, ed - 0.06)]} />
              <lineBasicMaterial color={R_BORDER} transparent opacity={0.2} />
            </lineSegments>

            {/* Label */}
            {ew > 0.5 && ed > 0.5 && (
              <Html
                position={[ex + ew / 2, 0.015, ez + ed / 2]}
                center
                style={{ pointerEvents: 'none' }}
              >
                <span style={{
                  color: R_BORDER,
                  fontSize,
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  opacity: 0.8,
                  textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(16,185,129,0.3)',
                }}>
                  RETALHO {areaM2}M²
                </span>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
