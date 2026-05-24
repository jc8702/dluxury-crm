import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { LayoutSimulacao, PecaSimulacao } from '../../domain/types';
import Rulers3D from './Rulers3D';
import CotasDim from './CotasDim';
import ToolpathPreview from './ToolpathPreview';
import RetalhosVis3D from './RetalhosVis3D';

interface CanvasSimulador3DProps {
  layout: LayoutSimulacao | null;
  onSelecionarPeca?: (peca: PecaSimulacao | null) => void;
  habilitarGrade?: boolean;
  habilitarCotas?: boolean;
  habilitarAnimacao?: boolean;
  habilitarRetalhos?: boolean;
  velocidadeAnimacao?: number;
}

const CORES = [
  '#E2AC00', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6',
  '#F97316', '#06B6D4', '#EC4899', '#84CC16', '#14B8A6',
  '#D946EF', '#F43F5E', '#0EA5E9', '#A855F7', '#22C55E',
];

const GL_CONFIG = { antialias: true };

const CAMERA_CONFIG = {
  position: [7, 5, 7] as [number, number, number],
  fov: 45,
  near: 0.1,
  far: 100,
};

const ORBIT_MIN_DIST = 0.5;
const ORBIT_MAX_DIST = 50;

function PecaBlock({ peca, cor, escala, selecionada, onClick }: {
  peca: PecaSimulacao;
  cor: string;
  escala: number;
  selecionada: boolean;
  onClick: () => void;
}) {
  const c = peca.comprimento / escala;
  const l = peca.largura / escala;
  const e = Math.max(peca.espessura / escala, 0.06);
  const px = peca.x / escala + c / 2;
  const pz = peca.y / escala + l / 2;
  const py = e / 2;

  return (
    <group>
      <mesh
        position={[px, py, pz]}
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
      <Html position={[px, py + e + 0.05, pz]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: selecionada ? '#E2AC00' : 'rgba(0,0,0,0.7)',
          color: selecionada ? '#000' : '#fff',
          fontSize: '8px',
          padding: '2px 4px',
          borderRadius: '3px',
          whiteSpace: 'nowrap',
          fontFamily: 'monospace',
          fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {peca.nome} {peca.comprimento}×{peca.largura}
        </div>
      </Html>
    </group>
  );
}

function SceneContent({ layout, onSheetClick }: {
  layout: LayoutSimulacao;
  onSheetClick: () => void;
}) {
  const escala = Math.max(layout.chapa.largura, layout.chapa.altura) / 10;
  const sheetW = layout.chapa.largura / escala;
  const sheetD = layout.chapa.altura / escala;
  const cx = sheetW / 2;
  const cz = sheetD / 2;
  const sheetH = 0.3;

  return (
    <group>
      <mesh position={[cx, -sheetH / 2, cz]} onClick={onSheetClick}>
        <boxGeometry args={[sheetW, sheetH, sheetD]} />
        <meshStandardMaterial color="#1F2937" roughness={0.9} metalness={0.1} />
      </mesh>
      <lineSegments position={[cx, 0.01, cz]}>
        <edgesGeometry args={[new THREE.BoxGeometry(sheetW, 0.01, sheetD)]} />
        <lineBasicMaterial color="#4B5563" />
      </lineSegments>
    </group>
  );
}

const Cena3D = React.memo(function Cena3D({
  layout,
  onSelecionarPecaRef,
  habilitarGrade,
  habilitarCotas,
  habilitarAnimacao,
  habilitarRetalhos,
  velocidadeAnimacao,
}: {
  layout: LayoutSimulacao;
  onSelecionarPecaRef: React.MutableRefObject<((peca: PecaSimulacao | null) => void) | undefined>;
  habilitarGrade?: boolean;
  habilitarCotas?: boolean;
  habilitarAnimacao?: boolean;
  habilitarRetalhos?: boolean;
  velocidadeAnimacao?: number;
}) {
  const escala = Math.max(layout.chapa.largura, layout.chapa.altura) / 10;
  const sheetW = layout.chapa.largura / escala;
  const sheetD = layout.chapa.altura / escala;
  const cx = sheetW / 2;
  const cz = sheetD / 2;

  const [pecaSelecionada, setPecaSelecionada] = useState<string | null>(null);

  const pecasComCor = useMemo(() => {
    const coloridas = layout.pecas.map((p, i) => ({ ...p, cor: CORES[i % CORES.length] }));
    return coloridas.sort((a, b) => b.y - a.y);
  }, [layout.pecas]);

  const pecaSelecionadaObj = useMemo(
    () => pecasComCor.find((p) => p.id === pecaSelecionada) ?? null,
    [pecasComCor, pecaSelecionada],
  );

  const handleClickSheet = useCallback(() => {
    setPecaSelecionada(null);
    onSelecionarPecaRef.current?.(null);
  }, [onSelecionarPecaRef]);

  const handleClickPeca = useCallback((peca: PecaSimulacao) => {
    setPecaSelecionada(peca.id);
    onSelecionarPecaRef.current?.(peca);
  }, [onSelecionarPecaRef]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[15, 20, 15]} intensity={0.8} />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />

      <SceneContent layout={layout} onSheetClick={handleClickSheet} />

      {habilitarGrade && (
        <Rulers3D sheetWidth={sheetW} sheetDepth={sheetD} escala={escala} cenaSize={Math.max(sheetW, sheetD)} habilitarGrade />
      )}

      {habilitarCotas && (
        <CotasDim layout={layout} escala={escala} pecaSelecionada={pecaSelecionadaObj} cenaSize={Math.max(sheetW, sheetD)} />
      )}

      {habilitarRetalhos && (
        <RetalhosVis3D layout={layout} escala={escala} cenaSize={Math.max(sheetW, sheetD)} />
      )}

      {pecasComCor.map((peca) => (
        <PecaBlock
          key={peca.id}
          peca={peca}
          cor={peca.cor}
          escala={escala}
          selecionada={pecaSelecionada === peca.id}
          onClick={() => handleClickPeca(peca)}
        />
      ))}

      {habilitarAnimacao && (
        <ToolpathPreview layout={layout} escala={escala} animando={true} velocidadeAnimacao={velocidadeAnimacao ?? 1} />
      )}

      <OrbitControls
        enableDamping
        dampingFactor={0.15}
        target={[cx, 0, cz]}
        minDistance={ORBIT_MIN_DIST}
        maxDistance={ORBIT_MAX_DIST}
      />
    </>
  );
});

export default function CanvasSimulador3D({
  layout,
  onSelecionarPeca,
  habilitarGrade = true,
  habilitarCotas = true,
  habilitarAnimacao = false,
  habilitarRetalhos = true,
  velocidadeAnimacao = 1,
}: CanvasSimulador3DProps) {
  const onSelecionarPecaRef = useRef(onSelecionarPeca);
  onSelecionarPecaRef.current = onSelecionarPeca;

  const scene = useMemo(() => {
    if (!layout) return null;
    return (
      <Cena3D
        key={layout.chapa.sku + layout.chapa.largura + layout.chapa.altura + layout.pecas.length}
        layout={layout}
        onSelecionarPecaRef={onSelecionarPecaRef}
        habilitarGrade={habilitarGrade}
        habilitarCotas={habilitarCotas}
        habilitarAnimacao={habilitarAnimacao}
        habilitarRetalhos={habilitarRetalhos}
        velocidadeAnimacao={velocidadeAnimacao}
      />
    );
  }, [layout, habilitarGrade, habilitarCotas, habilitarAnimacao, habilitarRetalhos, velocidadeAnimacao]);

  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.setClearColor('#0D1117');
  }, []);

  if (!layout) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0D1117] rounded-xl border border-[#1F2937]">
        <p className="text-[#6B7280] text-sm">NENHUM LAYOUT CARREGADO</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-[#1F2937] bg-[#0D1117] relative">
      <Canvas camera={CAMERA_CONFIG} gl={GL_CONFIG} onCreated={handleCreated}>
        {scene}
      </Canvas>
    </div>
  );
}
