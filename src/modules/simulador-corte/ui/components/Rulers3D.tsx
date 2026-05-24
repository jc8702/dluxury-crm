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

const TICK_COLOR = '#6B7280';
const TICK_MAJOR_COLOR = '#9CA3AF';
const LABEL_COLOR = '#9CA3AF';
const GRID_COLOR = '#1F2937';
const GRID_SUB_COLOR = '#1A1F2E';

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
    const tickHeight = 0.15;
    const majorTickHeight = 0.3;

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

  return (
    <group>
      {/* RULER X (bottom edge) */}
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
                    tick.pos, -h, 0,
                    tick.pos, 0, 0,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={isMajor ? TICK_MAJOR_COLOR : TICK_COLOR} />
            </lineSegments>
            {isMajor && (
              <Html
                position={[tick.pos, -h - 0.08, 0]}
                center
                style={{ pointerEvents: 'none', transform: 'translateY(4px)' }}
              >
                <span style={{
                  color: LABEL_COLOR,
                  fontSize: `${7 * labelScale}px`,
                  fontFamily: 'monospace',
                  fontWeight: 500,
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                }}>
                  {tick.label}
                </span>
              </Html>
            )}
          </group>
        );
      })}

      {/* RULER Z (left edge) */}
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
                    0, -h, tick.pos,
                    0, 0, tick.pos,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={isMajor ? TICK_MAJOR_COLOR : TICK_COLOR} />
            </lineSegments>
            {isMajor && (
              <Html
                position={[-0.12, -h - 0.08, tick.pos]}
                center
                style={{ pointerEvents: 'none', transform: 'translateX(-6px)' }}
              >
                <span style={{
                  color: LABEL_COLOR,
                  fontSize: `${7 * labelScale}px`,
                  fontFamily: 'monospace',
                  fontWeight: 500,
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                }}>
                  {tick.label}
                </span>
              </Html>
            )}
          </group>
        );
      })}

      {/* RULER X (top edge) */}
      {rulerConfig.xTicks.map((tick, i) => (
        <lineSegments key={`xt-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                tick.pos, -rulerConfig.tickHeight, sheetDepth,
                tick.pos, 0, sheetDepth,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={TICK_COLOR} />
        </lineSegments>
      ))}

      {/* RULER Z (right edge) */}
      {rulerConfig.zTicks.map((tick, i) => (
        <lineSegments key={`zr-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                sheetWidth, -rulerConfig.tickHeight, tick.pos,
                sheetWidth, 0, tick.pos,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={TICK_COLOR} />
        </lineSegments>
      ))}

      {/* GRADE DO CHÃO */}
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
                    0, -0.005, line.z,
                    sheetWidth, -0.005, line.z,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={i % 5 === 0 ? GRID_COLOR : GRID_SUB_COLOR}
                transparent
                opacity={i % 5 === 0 ? 0.6 : 0.25}
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
                    line.x, -0.005, 0,
                    line.x, -0.005, sheetDepth,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={i % 5 === 0 ? GRID_COLOR : GRID_SUB_COLOR}
                transparent
                opacity={i % 5 === 0 ? 0.6 : 0.25}
              />
            </lineSegments>
          ))}
        </group>
      )}
    </group>
  );
}
