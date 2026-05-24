import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';

interface Rulers3DProps {
  sheetWidth: number;
  sheetDepth: number;
  escala: number;
  cenaSize: number;
  habilitarGrade?: boolean;
  passoGrade?: number;
}

const TICK_COLOR = '#7C5E43'; // Marrom médio para ticks secundários
const TICK_MAJOR_COLOR = '#4A3321'; // Marrom escuro para ticks principais
const LABEL_COLOR = '#F3F4F6'; // Cinza claro/branco para leitura em cima do canvas escuro
const GRID_COLOR = '#8C6D53'; // Linhas principais do grid
const GRID_SUB_COLOR = '#A38A75'; // Linhas secundárias do grid

export default function Rulers3D({
  sheetWidth,
  sheetDepth,
  escala,
  cenaSize,
  habilitarGrade = true,
  passoGrade,
}: Rulers3DProps) {
  const rulerConfig = useMemo(() => {
    const rawStep = 100; // 100mm base step
    const majorEvery = 5;
    const tickHeight = 0.12;
    const majorTickHeight = 0.22;

    const totalWidth = sheetWidth * escala;
    const totalDepth = sheetDepth * escala;

    const xTicks: { pos: number; label: string; isMajor: boolean }[] = [];
    const zTicks: { pos: number; label: string; isMajor: boolean }[] = [];

    for (let mm = 0; mm <= totalWidth; mm += rawStep) {
      xTicks.push({
        pos: mm / escala,
        label: mm.toString(),
        isMajor: (mm / rawStep) % majorEvery === 0,
      });
    }

    for (let mm = 0; mm <= totalDepth; mm += rawStep) {
      zTicks.push({
        pos: mm / escala,
        label: mm.toString(),
        isMajor: (mm / rawStep) % majorEvery === 0,
      });
    }

    return { xTicks, zTicks, tickHeight, majorTickHeight, rawStep };
  }, [sheetWidth, sheetDepth, escala]);

  const step = passoGrade || 100;
  const gridStep = step / escala;

  // Avoid too many grid lines
  const gridXCount = Math.min(Math.floor(sheetWidth / gridStep), 50);
  const gridZCount = Math.min(Math.floor(sheetDepth / gridStep), 50);

  const gridXLines = useMemo(() => {
    const lines: { x: number }[] = [];
    for (let i = 0; i <= gridXCount; i++) {
      lines.push({ x: i * gridStep });
    }
    return lines;
  }, [gridStep, gridXCount]);

  const gridZLines = useMemo(() => {
    const lines: { z: number }[] = [];
    for (let i = 0; i <= gridZCount; i++) {
      lines.push({ z: i * gridStep });
    }
    return lines;
  }, [gridStep, gridZCount]);

  const labelScale = Math.max(0.3, Math.min(1, cenaSize * 0.04));
  const fontSize = `${Math.max(12, 16 * labelScale)}px`;

  return (
    <group>
      {/* RULER X (bottom/front edge - deitada para frente) */}
      {rulerConfig.xTicks.map((tick, i) => {
        const isMajor = tick.isMajor;
        const h = isMajor ? rulerConfig.majorTickHeight : rulerConfig.tickHeight;
        return (
          <group key={`x-${i}`}>
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    tick.pos, 0.002, 0,
                    tick.pos, 0.002, -h,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={isMajor ? TICK_MAJOR_COLOR : TICK_COLOR} linewidth={isMajor ? 2 : 1} />
            </lineSegments>
            {isMajor && (
              <Html
                position={[tick.pos, 0.003, -h - 0.08]}
                center
                style={{ pointerEvents: 'none', transform: 'translateY(-2px)' }}
              >
                <span style={{
                  color: LABEL_COLOR,
                  fontSize,
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  textShadow: '0 0 3px #000, 0 1px 2px #000, 0 0 8px rgba(255,255,255,0.2)',
                }}>
                  {tick.label}
                </span>
              </Html>
            )}
          </group>
        );
      })}

      {/* RULER Z (left edge - deitada para a esquerda) */}
      {rulerConfig.zTicks.map((tick, i) => {
        const isMajor = tick.isMajor;
        const h = isMajor ? rulerConfig.majorTickHeight : rulerConfig.tickHeight;
        return (
          <group key={`z-${i}`}>
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    0, 0.002, tick.pos,
                    -h, 0.002, tick.pos,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={isMajor ? TICK_MAJOR_COLOR : TICK_COLOR} linewidth={isMajor ? 2 : 1} />
            </lineSegments>
            {isMajor && (
              <Html
                position={[-h - 0.08, 0.003, tick.pos]}
                center
                style={{ pointerEvents: 'none', transform: 'translateX(-2px)' }}
              >
                <span style={{
                  color: LABEL_COLOR,
                  fontSize,
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  textShadow: '0 0 3px #000, 0 1px 2px #000, 0 0 8px rgba(255,255,255,0.2)',
                }}>
                  {tick.label}
                </span>
              </Html>
            )}
          </group>
        );
      })}

      {/* RULER X (top/back edge - deitada para trás) */}
      {rulerConfig.xTicks.map((tick, i) => (
        <lineSegments key={`xt-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                tick.pos, 0.002, sheetDepth,
                tick.pos, 0.002, sheetDepth + rulerConfig.tickHeight,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={TICK_COLOR} />
        </lineSegments>
      ))}

      {/* RULER Z (right edge - deitada para a direita) */}
      {rulerConfig.zTicks.map((tick, i) => (
        <lineSegments key={`zr-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                sheetWidth, 0.002, tick.pos,
                sheetWidth + rulerConfig.tickHeight, 0.002, tick.pos,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={TICK_COLOR} />
        </lineSegments>
      ))}

      {/* GRADE SOBRE A CHAPA (Projetada a Y = 0.001) */}
      {habilitarGrade && gridStep >= 0.01 && (
        <group>
          {/* Linhas Z (horizontal) */}
          {gridZLines.map((line, i) => (
            <lineSegments key={`gz-${i}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    0, 0.001, line.z,
                    sheetWidth, 0.001, line.z,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={i % 5 === 0 ? GRID_COLOR : GRID_SUB_COLOR}
                transparent
                opacity={i % 5 === 0 ? 0.35 : 0.15}
              />
            </lineSegments>
          ))}
          {/* Linhas X (vertical) */}
          {gridXLines.map((line, i) => (
            <lineSegments key={`gx-${i}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    line.x, 0.001, 0,
                    line.x, 0.001, sheetDepth,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={i % 5 === 0 ? GRID_COLOR : GRID_SUB_COLOR}
                transparent
                opacity={i % 5 === 0 ? 0.35 : 0.15}
              />
            </lineSegments>
          ))}
        </group>
      )}
    </group>
  );
}
