import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { FixtureDefinition } from '../../domain/types';

interface CncMachine3DProps {
  x: number;             // Posição física X em mm
  y: number;             // Posição física Y (profundidade de corte/avanço) em mm
  z: number;             // Posição física Z (profundidade/altura vertical) em mm
  escala: number;
  sheetWidth: number;    // Largura escalada da chapa
  sheetDepth: number;    // Profundidade escalada da chapa
  fixtures: FixtureDefinition[];
  spindleOn: boolean;
  rpm: number;
  mostrarMaquina?: boolean;
  mostrarClamps?: boolean;
}

export default function CncMachine3D({
  x,
  y,
  z,
  escala,
  sheetWidth,
  sheetDepth,
  fixtures,
  spindleOn,
  rpm,
  mostrarMaquina = true,
  mostrarClamps = true,
}: CncMachine3DProps) {
  // Transforma mm físicos para escala do R3F 3D
  // No Three.js do simulador: X é largura, Z é profundidade, Y é a altura vertical.
  const toolX = x / escala;
  const toolZ = y / escala;
  const toolY = z / escala;

  // Dimensões do Spindle
  const spindleH = 0.5;
  const spindleR = 0.08;

  // Clamps 3D
  const clamps3D = useMemo(() => {
    return fixtures.map((fx) => {
      const cx = fx.x / escala;
      const cz = fx.y / escala;
      const cw = fx.largura / escala;
      const cd = fx.altura / escala;
      const ch = fx.espessura / escala;
      return { id: fx.id, x: cx, z: cz, w: cw, d: cd, h: ch };
    });
  }, [fixtures, escala]);

  return (
    <group>
      {/* 1. MESA DE VÁCUO / SPOILBOARD DA MÁQUINA (Base cinza escura estrutural) */}
      {mostrarMaquina && (
        <group>
          {/* Base estrutural abaixo do MDF */}
          <mesh position={[sheetWidth / 2, -0.31, sheetDepth / 2]}>
            <boxGeometry args={[sheetWidth + 1.2, 0.3, sheetDepth + 1.2]} />
            <meshStandardMaterial color="#1E293B" roughness={0.85} metalness={0.4} />
          </mesh>
          <lineSegments position={[sheetWidth / 2, -0.16, sheetDepth / 2]}>
            <edgesGeometry args={[new THREE.BoxGeometry(sheetWidth + 1.2, 0.3, sheetDepth + 1.2)]} />
            <lineBasicMaterial color="#334155" />
          </lineSegments>

          {/* Guias Lineares Laterais Eixo Y (Cilindros cromados de trilho nas laterais) */}
          <mesh position={[-0.45, -0.14, sheetDepth / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, sheetDepth + 1.0, 8]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.15} metalness={0.95} />
          </mesh>
          <mesh position={[sheetWidth + 0.45, -0.14, sheetDepth / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, sheetDepth + 1.0, 8]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.15} metalness={0.95} />
          </mesh>
        </group>
      )}

      {/* 2. GANRY (PÓRTICO / EIXO Y) - Move longitudinalmente em Z seguindo a fresa */}
      {mostrarMaquina && (
        <group position={[sheetWidth / 2, 0.35, toolZ]}>
          {/* Colunas do Gantry (Pés laterais que deslizam nos trilhos de Y) */}
          <mesh position={[-(sheetWidth / 2 + 0.45), -0.2, 0]}>
            <boxGeometry args={[0.15, 0.6, 0.3]} />
            <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[sheetWidth / 2 + 0.45, -0.2, 0]}>
            <boxGeometry args={[0.15, 0.6, 0.3]} />
            <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.3} />
          </mesh>

          {/* Travessa Horizontal Principal Eixo X (Viga de alumínio estrutural) */}
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[sheetWidth + 1.0, 0.28, 0.16]} />
            <meshStandardMaterial color="#EA580C" roughness={0.3} metalness={0.2} /> {/* Laranja industrial */}
          </mesh>

          {/* Placa metálica decorativa na viga */}
          <mesh position={[0, 0.2, 0.082]}>
            <planeGeometry args={[sheetWidth * 0.7, 0.16]} />
            <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.8} />
          </mesh>

          {/* Guias Lineares Eixo X (Trilhos cromados horizontais) */}
          <mesh position={[0, 0.26, 0.09]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, sheetWidth + 0.8, 8]} />
            <meshStandardMaterial color="#F1F5F9" roughness={0.1} metalness={0.95} />
          </mesh>
          <mesh position={[0, 0.14, 0.09]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, sheetWidth + 0.8, 8]} />
            <meshStandardMaterial color="#F1F5F9" roughness={0.1} metalness={0.95} />
          </mesh>
        </group>
      )}

      {/* 3. CARRO DO SPINDLE (EIXO X) E CABEÇOTE VERTICAL (EIXO Z) - Desliza em X e Z */}
      {mostrarMaquina && (
        <group position={[toolX, 0.35 + 0.2, toolZ]}>
          {/* Carro do Spindle (Placa traseira de aço) */}
          <mesh position={[0, 0, 0.12]}>
            <boxGeometry args={[0.22, 0.32, 0.04]} />
            <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.7} />
          </mesh>

          {/* Guias Lineares Verticais Eixo Z */}
          <mesh position={[-0.07, 0, 0.15]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.34, 8]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.1} metalness={0.9} />
          </mesh>
          <mesh position={[0.07, 0, 0.15]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.34, 8]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.1} metalness={0.9} />
          </mesh>

          {/* Cabeçote Z Deslizante (Suporte físico do Spindle que move para cima/baixo seguindo toolY) */}
          {/* A viga do gantry está em Y = 0.55. O spindle vertical translada em relação a essa viga. */}
          <group position={[0, toolY - 0.2, 0.08]}>
            {/* Placa frontal de montagem */}
            <mesh position={[0, 0, 0.1]}>
              <boxGeometry args={[0.18, 0.28, 0.03]} />
              <meshStandardMaterial color="#64748B" roughness={0.4} metalness={0.6} />
            </mesh>

            {/* Suporte de abraçadeira cilíndrica do Spindle */}
            <mesh position={[0, 0, 0.14]}>
              <boxGeometry args={[0.12, 0.08, 0.06]} />
              <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
            </mesh>

            {/* SPINDLE CNC REALISTA COM BROCA/FRESA */}
            <group position={[0, -0.15, 0.18]}>
              {/* Luz indicadora de operação (Ponto de luz na ponta da ferramenta) */}
              {spindleOn && (
                <pointLight position={[0, -0.22, 0]} intensity={1.8} distance={1.5} color="#00FFFF" />
              )}

              {/* Fresa de metal duro (Dourada) */}
              <group rotation={[0, spindleOn ? Date.now() * 0.05 : 0, 0]}>
                <mesh position={[0, -0.2, 0]}>
                  <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} />
                  <meshStandardMaterial color="#FBBF24" emissive="#D97706" emissiveIntensity={spindleOn ? 0.25 : 0} metalness={0.9} roughness={0.1} />
                </mesh>
              </group>

              {/* Mandril de cromo polido (Collet) */}
              <mesh position={[0, -0.11, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.06, 12]} />
                <meshStandardMaterial color="#F3F4F6" metalness={0.98} roughness={0.02} />
              </mesh>

              {/* Anel Inferior de LED Neon Ciano */}
              <mesh position={[0, -0.07, 0]}>
                <torusGeometry args={[0.041, 0.007, 8, 20]} />
                <meshStandardMaterial
                  color="#00FFFF"
                  emissive="#00FFFF"
                  emissiveIntensity={spindleOn ? 3.5 : 0.5}
                />
              </mesh>

              {/* Porca do Mandril industrial */}
              <mesh position={[0, -0.06, 0]}>
                <cylinderGeometry args={[0.046, 0.046, 0.03, 6]} />
                <meshStandardMaterial color="#1E293B" metalness={0.7} roughness={0.5} />
              </mesh>

              {/* Corpo do Motor do Spindle (Laranja vibrante) */}
              <mesh position={[0, 0.12, 0]}>
                <cylinderGeometry args={[0.075, 0.075, 0.32, 16]} />
                <meshStandardMaterial color="#EA580C" metalness={0.2} roughness={0.2} />
              </mesh>

              {/* Refrigeração aletada central (Cromada) */}
              <mesh position={[0, 0.3, 0]}>
                <cylinderGeometry args={[0.074, 0.074, 0.05, 16]} />
                <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.1} />
              </mesh>

              {/* Tampa superior com cooler de refrigeração */}
              <mesh position={[0, 0.35, 0]}>
                <cylinderGeometry args={[0.075, 0.065, 0.04, 16]} />
                <meshStandardMaterial color="#F3F4F6" metalness={0.9} roughness={0.1} />
              </mesh>
              <mesh position={[0, 0.375, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 0.015, 16]} />
                <meshStandardMaterial color="#0F172A" metalness={0.5} roughness={0.6} />
              </mesh>

              {/* Anel de LED superior indicativo de status da ferramenta */}
              <mesh position={[0, 0.33, 0]}>
                <torusGeometry args={[0.076, 0.007, 8, 20]} />
                <meshStandardMaterial
                  color={spindleOn ? '#00FFFF' : '#64748B'}
                  emissive={spindleOn ? '#00FFFF' : '#000000'}
                  emissiveIntensity={spindleOn ? 3.0 : 0}
                />
              </mesh>
            </group>
          </group>
        </group>
      )}

      {/* 4. CLAMPS (GARRAS DE FIXAÇÃO DO STOCK) */}
      {mostrarClamps &&
        clamps3D.map((clamp) => {
          // Cada clamp consiste em um bloco base na lateral da chapa, e um braço de pressão metálico
          // que avança 20-30mm por cima do MDF para fixá-lo.
          const yBase = clamp.h / 2 - 0.15; // posicionado na spoilboard/MDF
          return (
            <group key={clamp.id} position={[clamp.x + clamp.w / 2, yBase, clamp.z + clamp.d / 2]}>
              {/* Bloco de suporte traseiro (Cinza escuro) */}
              <mesh>
                <boxGeometry args={[clamp.w, clamp.h, clamp.d]} />
                <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.4} />
              </mesh>
              <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(clamp.w, clamp.h, clamp.d)]} />
                <lineBasicMaterial color="#475569" />
              </lineSegments>

              {/* Parafuso central do grampo (Rosca cromada) */}
              <mesh position={[0, clamp.h / 2 + 0.06, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.14, 8]} />
                <meshStandardMaterial color="#E2E8F0" roughness={0.2} metalness={0.9} />
              </mesh>

              {/* Manípulo giratório de aperto (Plástico preto) */}
              <mesh position={[0, clamp.h / 2 + 0.13, 0]}>
                <boxGeometry args={[0.04, 0.016, 0.012]} />
                <meshStandardMaterial color="#0F172A" roughness={0.5} metalness={0.1} />
              </mesh>

              {/* Braço de fixação pivotado (Chapa de aço cromada que deita sobre o MDF) */}
              {/* O braço avança na direção do centro da mesa. 
                  Como o clamp fica nas extremidades, seu braço deve apontar para dentro do MDF. */}
              {(() => {
                const zOffset = clamp.z < sheetDepth / 2 ? 0.03 : -0.03;
                const rAngle = clamp.z < sheetDepth / 2 ? 0 : Math.PI;
                return (
                  <group position={[0, clamp.h / 2 - 0.01, zOffset]} rotation={[0, rAngle, 0]}>
                    <mesh position={[0, 0, 0.04]}>
                      <boxGeometry args={[0.024, 0.012, 0.1]} />
                      <meshStandardMaterial color="#94A3B8" roughness={0.2} metalness={0.8} />
                    </mesh>
                    {/* Ponteira de borracha amarela de aperto que toca o MDF */}
                    <mesh position={[0, -0.01, 0.08]}>
                      <cylinderGeometry args={[0.01, 0.01, 0.016, 8]} />
                      <meshStandardMaterial color="#E2AC00" roughness={0.5} metalness={0.1} />
                    </mesh>
                  </group>
                );
              })()}
            </group>
          );
        })}
    </group>
  );
}
