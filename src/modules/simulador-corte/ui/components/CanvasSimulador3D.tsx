import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { LayoutSimulacao, PecaSimulacao } from '../../domain/types';

interface CanvasSimulador3DProps {
  layout: LayoutSimulacao | null;
  onSelecionarPeca?: (peca: PecaSimulacao | null) => void;
}

const CORES = [
  '#E2AC00', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6',
  '#F97316', '#06B6D4', '#EC4899', '#84CC16', '#14B8A6',
  '#D946EF', '#F43F5E', '#0EA5E9', '#A855F7', '#22C55E',
];

interface PecaBlockProps {
  peca: PecaSimulacao;
  cor: string;
  escala: number;
  selecionada: boolean;
  onClick: () => void;
}

function PecaBlock({ peca, cor, escala, selecionada, onClick }: PecaBlockProps) {
  const c = peca.comprimento / escala;
  const l = peca.largura / escala;
  const e = Math.max(peca.espessura / escala, 0.06);
  const px = peca.x / escala + c / 2;
  const pz = peca.y / escala + l / 2;

  return (
    <mesh
      position={[px, e / 2, pz]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      <boxGeometry args={[c, e, l]} />
      <meshStandardMaterial
        color={selecionada ? '#ffffff' : cor}
        emissive={selecionada ? '#E2AC00' : '#000000'}
        emissiveIntensity={selecionada ? 0.3 : 0}
        roughness={0.6}
        metalness={0.1}
      />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(c, e, l)]} />
        <lineBasicMaterial color={selecionada ? '#E2AC00' : '#1F2937'} />
      </lineSegments>
    </mesh>
  );
}

function Cena3D({ layout, onSelecionarPeca }: { layout: LayoutSimulacao; onSelecionarPeca?: (peca: PecaSimulacao | null) => void }) {
  const [pecaSelecionada, setPecaSelecionada] = useState<string | null>(null);
  const escala = useMemo(() => Math.max(layout.chapa.largura, layout.chapa.altura) / 10, [layout]);

  const sheetW = layout.chapa.largura / escala;
  const sheetD = layout.chapa.altura / escala;
  const sheetH = 0.3;
  const cx = sheetW / 2;
  const cz = sheetD / 2;

  const pecasComCor = useMemo(() =>
    layout.pecas.map((p, i) => ({ ...p, cor: CORES[i % CORES.length] })),
    [layout.pecas]
  );

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <directionalLight position={[-10, 5, -10]} intensity={0.3} />

      {/* Chapa — base sólida */}
      <mesh
        position={[cx, -sheetH / 2, cz]}
        onClick={() => { setPecaSelecionada(null); onSelecionarPeca?.(null); }}
      >
        <boxGeometry args={[sheetW, sheetH, sheetD]} />
        <meshStandardMaterial color="#1F2937" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Borda da chapa — linha clara para delimitar */}
      <lineSegments position={[cx, 0.01, cz]}>
        <edgesGeometry args={[new THREE.BoxGeometry(sheetW, 0.01, sheetD)]} />
        <lineBasicMaterial color="#4B5563" />
      </lineSegments>

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
        dampingFactor={0.15}
        target={[cx, 0, cz]}
        minDistance={1}
        maxDistance={30}
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
          position: [escalaView * 0.7, escalaView * 0.4, escalaView * 0.7],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => gl.setClearColor('#0D1117')}
      >
        <Cena3D layout={layout} onSelecionarPeca={onSelecionarPeca} />
      </Canvas>
    </div>
  );
}
