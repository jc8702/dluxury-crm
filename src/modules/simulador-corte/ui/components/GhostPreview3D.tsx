import React from 'react';
import * as THREE from 'three';
import type { GhostPreviewItem } from '../../domain/types';

interface GhostPreview3DProps {
  items: GhostPreviewItem[];
  escala: number;
  sheetWidth: number;
  sheetDepth: number;
}

export default function GhostPreview3D({ items, escala }: GhostPreview3DProps) {
  if (items.length === 0) return null;

  return (
    <group>
      {items.map((item) => {
        const px = item.x / escala;
        const pz = item.y / escala;
        const pw = item.largura / escala;
        const pd = item.altura / escala;
        const cor = item.cor ?? '#10B981';

        switch (item.type) {
          case 'clamp':
            return (
              <group key={item.id} position={[px + pw / 2, 0.01, pz + pd / 2]}>
                <mesh>
                  <boxGeometry args={[pw, 0.4, pd]} />
                  <meshStandardMaterial
                    color={cor}
                    transparent
                    opacity={0.3}
                    depthWrite={false}
                    roughness={0.3}
                    metalness={0.1}
                  />
                </mesh>
                <lineSegments>
                  <edgesGeometry args={[new THREE.BoxGeometry(pw, 0.4, pd)]} />
                  <lineBasicMaterial color={cor} transparent opacity={0.7} />
                </lineSegments>
              </group>
            );
          case 'part':
            return (
              <group key={item.id} position={[px + pw / 2, 0.02, pz + pd / 2]}>
                <mesh>
                  <boxGeometry args={[pw, 0.1, pd]} />
                  <meshStandardMaterial
                    color={cor}
                    transparent
                    opacity={0.25}
                    depthWrite={false}
                    roughness={0.5}
                    metalness={0.0}
                  />
                </mesh>
                <lineSegments>
                  <edgesGeometry args={[new THREE.BoxGeometry(pw, 0.1, pd)]} />
                  <lineBasicMaterial color={cor} transparent opacity={0.6} />
                </lineSegments>
              </group>
            );
          case 'safeZ_plane':
            return (
              <group key={item.id}>
                <mesh position={[px + pw / 2, item.largura / escala, pz + pd / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[pw, pd]} />
                  <meshBasicMaterial
                    color={cor}
                    transparent
                    opacity={0.12}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </group>
            );
          default:
            return null;
        }
      })}
    </group>
  );
}
