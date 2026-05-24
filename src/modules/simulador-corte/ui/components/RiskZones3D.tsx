import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { FixtureDefinition, SimulationIssue } from '../../domain/types';

interface RiskZones3DProps {
  fixtures: FixtureDefinition[];
  issues: SimulationIssue[];
  escala: number;
  sheetWidth: number;
  sheetDepth: number;
}

export default function RiskZones3D({
  fixtures,
  issues,
  escala,
  sheetWidth,
  sheetDepth,
}: RiskZones3DProps) {
  const collisionPoints = useMemo(() => {
    return issues
      .filter(i => i.severidade === 'error')
      .map(i => ({
        x: i.posicao.x / escala,
        z: i.posicao.y / escala,
        y: Math.max(i.posicao.z / escala, 0.01),
      }));
  }, [issues, escala]);

  const clampZones = useMemo(() => {
    return fixtures.map(fx => {
      const cx = fx.x / escala + fx.largura / escala / 2;
      const cz = fx.y / escala + fx.altura / escala / 2;
      const cw = fx.largura / escala + 0.06;
      const cd = fx.altura / escala + 0.06;
      return { x: cx, z: cz, w: cw, d: cd };
    });
  }, [fixtures, escala]);

  return (
    <group>
      {clampZones.map((zone, i) => (
        <mesh
          key={`risk_clamp_${i}`}
          position={[zone.x, 0.02, zone.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[zone.w, zone.d]} />
          <meshBasicMaterial
            color="#EF4444"
            transparent
            opacity={0.25}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {collisionPoints.map((pt, i) => (
        <mesh key={`risk_col_${i}`} position={[pt.x, pt.y + 0.05, pt.z]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial
            color="#EF4444"
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </mesh>
      ))}
      {collisionPoints.map((pt, i) => (
        <mesh key={`risk_col_ring_${i}`} position={[pt.x, 0.02, pt.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, 0.18, 24]} />
          <meshBasicMaterial
            color="#EF4444"
            transparent
            opacity={0.4}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
