import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Clone } from '@react-three/drei';
import * as THREE from 'three';
import type { LayoutSimulacao, PecaSimulacao } from '../../domain/types';
import { useToast } from '../../../../context/ToastContext';

interface CanvasSimulador3DProps {
  layout: LayoutSimulacao | null;
  onSelecionarPeca?: (peca: PecaSimulacao | null) => void;
}

function generateColor(index: number): string {
  const cores = [
    '#E2AC00', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6',
    '#F97316', '#06B6D4', '#EC4899', '#84CC16', '#14B8A6',
    '#D946EF', '#F43F5E', '#0EA5E9', '#A855F7', '#22C55E',
  ];
  return cores[index % cores.length];
}

interface PecaBlockProps {
  peca: PecaSimulacao;
  cor: string;
  escala: number;
  selecionada: boolean;
  onClick: () => void;
}

function PecaBlock({ peca, cor, escala, selecionada, onClick }: PecaBlockProps) {
  const larg = (peca.largura / escala);
  const alt = (peca.altura / escala);
  const posX = (peca.x / escala) + larg / 2;
  const posZ = (peca.y / escala) + alt / 2;
  const espessura = 2;

  return (
    <mesh
      position={[posX, espessura / 2, posZ]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.object.userData.hover = true; document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { e.object.userData.hover = false; document.body.style.cursor = 'default'; }}
    >
      <boxGeometry args={[larg, espessura, alt]} />
      <meshStandardMaterial
        color={selecionada ? '#FFFFFF' : cor}
        emissive={selecionada ? '#E2AC00' : '#000000'}
        emissiveIntensity={selecionada ? 0.3 : 0}
        roughness={0.6}
        metalness={0.1}
      />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(larg, espessura, alt)]} />
        <lineBasicMaterial color="#1F2937" linewidth={1} />
      </lineSegments>
    </mesh>
  );
}

function Cena3D({ layout, onSelecionarPeca }: { layout: LayoutSimulacao; onSelecionarPeca?: (peca: PecaSimulacao | null) => void }) {
  const [pecaSelecionada, setPecaSelecionada] = useState<string | null>(null);
  const escala = useMemo(() => Math.max(layout.chapa.largura, layout.chapa.altura) / 10, [layout]);

  const chapaLarg = layout.chapa.largura / escala;
  const chapaAlt = layout.chapa.altura / escala;
  const metadeLarg = chapaLarg / 2;
  const metadeAlt = chapaAlt / 2;

  const pecasComCor = useMemo(() =>
    layout.pecas.map((p, i) => ({ ...p, cor: generateColor(i) })),
    [layout.pecas]
  );

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />

      {/* Chapa (base) */}
      <mesh
        position={[metadeLarg, -0.5, metadeAlt]}
        onClick={() => { setPecaSelecionada(null); onSelecionarPeca?.(null); }}
      >
        <boxGeometry args={[chapaLarg, 1, chapaAlt]} />
        <meshStandardMaterial color="#1F2937" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Grid */}
      <gridHelper args={[Math.max(chapaLarg, chapaAlt), 10, '#374151', '#1F2937']} position={[metadeLarg, 0, metadeAlt]} />

      {/* Peças */}
      {pecasComCor.map((peca) => (
        <PecaBlock
          key={peca.id}
          peca={peca}
          cor={peca.cor}
          escala={escala}
          selecionada={pecaSelecionada === peca.id}
          onClick={() => {
            setPecaSelecionada(peca.id);
            onSelecionarPeca?.(peca);
          }}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        target={[metadeLarg, 0, metadeAlt]}
        minDistance={2}
        maxDistance={50}
      />
    </>
  );
}

export default function CanvasSimulador3D({ layout, onSelecionarPeca }: CanvasSimulador3DProps) {
  if (!layout) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0D1117] rounded-xl border border-[#1F2937]">
        <p className="text-[#6B7280] text-sm">NENHUM LAYOUT CARREGADO</p>
      </div>
    );
  }

  const escalaView = Math.max(layout.chapa.largura, layout.chapa.altura) / 10;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-[#1F2937] bg-[#0D1117] relative">
      <Canvas
        camera={{
          position: [escalaView * 0.8, escalaView * 0.6, escalaView * 0.8],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0D1117');
        }}
      >
        <Cena3D layout={layout} onSelecionarPeca={onSelecionarPeca} />
      </Canvas>
    </div>
  );
}
