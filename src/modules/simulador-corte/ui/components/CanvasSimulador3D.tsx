import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { LayoutSimulacao, PecaSimulacao, SimulationProgram } from '../../domain/types';
import Rulers3D from './Rulers3D';
import CotasDim from './CotasDim';
import ToolpathPreview from './ToolpathPreview';
import RetalhosVis3D from './RetalhosVis3D';
import CncMachine3D from './CncMachine3D';
import StockRemoval3D from './StockRemoval3D';
import { obterEstadoNoInstante, obterFixturesPadrao, TOOL_DEFAULT } from '../../domain/simulationEngine';

interface CanvasSimulador3DProps {
  layout: LayoutSimulacao | null;
  onSelecionarPeca?: (peca: PecaSimulacao | null) => void;
  habilitarGrade?: boolean;
  habilitarCotas?: boolean;
  habilitarAnimacao?: boolean;
  habilitarRetalhos?: boolean;
  mostrarMaquina?: boolean;
  mostrarStock?: boolean;
  mostrarClamps?: boolean;
  mostrarCaminho?: boolean;
  program: SimulationProgram;
  tempoAtual: number;
}

const CORES = [
  '#3B82F6', '#EF4444', '#10B981', '#8B5CF6',
  '#F97316', '#06B6D4', '#EC4899', '#84CC16', '#14B8A6',
  '#D946EF', '#F43F5E', '#0EA5E9', '#A855F7', '#22C55E',
];

const GL_CONFIG = { antialias: true };

const CAMERA_CONFIG = {
  position: [7, 6, 9] as [number, number, number],
  fov: 42,
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
  const e = Math.max(peca.espessura / escala, 0.05);
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
          emissiveIntensity={selecionada ? 0.35 : 0}
          roughness={0.65}
          metalness={0.1}
        />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(c, e, l)]} />
          <lineBasicMaterial color={selecionada ? '#E2AC00' : '#111827'} />
        </lineSegments>
      </mesh>
      <Html position={[px, py + e + 0.04, pz]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: selecionada ? '#E2AC00' : 'rgba(15,23,42,0.85)',
          color: selecionada ? '#0f172a' : '#f8fafc',
          fontSize: '11px',
          padding: '2px 5px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          fontFamily: 'monospace',
          fontWeight: 700,
          border: selecionada ? '1px solid #E2AC00' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}>
          {peca.nome} {peca.comprimento}×{peca.largura}
        </div>
      </Html>
    </group>
  );
}

function SceneContent({ layout, onSheetClick, mostrarStock }: {
  layout: LayoutSimulacao;
  onSheetClick: () => void;
  mostrarStock: boolean;
}) {
  const escala = Math.max(layout.chapa.largura, layout.chapa.altura) / 10;
  const sheetW = layout.chapa.largura / escala;
  const sheetD = layout.chapa.altura / escala;
  const cx = sheetW / 2;
  const cz = sheetD / 2;
  const sheetH = Math.max(layout.chapa.espessura / escala, 0.05);

  return (
    <group>
      {/* Corpo principal do MDF (Placa base) */}
      {/* Se o stock removal estiver ativado, a placa de MDF tem cor levemente alterada embaixo ou é desenhada */}
      <mesh position={[cx, -sheetH / 2, cz]} onClick={onSheetClick}>
        <boxGeometry args={[sheetW, sheetH, sheetD]} />
        <meshStandardMaterial color="#A27D54" roughness={0.7} metalness={0.0} />
      </mesh>
      <lineSegments position={[cx, 0.001, cz]}>
        <edgesGeometry args={[new THREE.BoxGeometry(sheetW, sheetH + 0.002, sheetD)]} />
        <lineBasicMaterial color="#5C4033" />
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
  mostrarMaquina,
  mostrarStock,
  mostrarClamps,
  mostrarCaminho,
  program,
  tempoAtual,
}: {
  layout: LayoutSimulacao;
  onSelecionarPecaRef: React.MutableRefObject<((peca: PecaSimulacao | null) => void) | undefined>;
  habilitarGrade?: boolean;
  habilitarCotas?: boolean;
  habilitarAnimacao?: boolean;
  habilitarRetalhos?: boolean;
  mostrarMaquina?: boolean;
  mostrarStock?: boolean;
  mostrarClamps?: boolean;
  mostrarCaminho?: boolean;
  program: SimulationProgram;
  tempoAtual: number;
}) {
  const escala = Math.max(layout.chapa.largura, layout.chapa.altura) / 10;
  const sheetW = layout.chapa.largura / escala;
  const sheetD = layout.chapa.altura / escala;

  const [pecaSelecionada, setPecaSelecionada] = useState<string | null>(null);

  const fixtures = useMemo(() => {
    return obterFixturesPadrao(layout.chapa.largura, layout.chapa.altura);
  }, [layout.chapa.largura, layout.chapa.altura]);

  // Calcula a posição física instantânea e dados da fresa no tempo atual
  const estadoFresa = useMemo(() => {
    return obterEstadoNoInstante(program, tempoAtual);
  }, [program, tempoAtual]);

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
      {/* 1. MDF BASE (STOCK) */}
      <SceneContent layout={layout} onSheetClick={handleClickSheet} mostrarStock={!!mostrarStock} />

      {/* 2. REMOÇÃO PROGRESSIVA DE ESTOQUE (STOCK REMOVAL) */}
      {mostrarStock && (
        <StockRemoval3D
          layout={layout}
          escala={escala}
          tempoAtual={tempoAtual}
          program={program}
          tool={TOOL_DEFAULT}
          mostrarStock={!!mostrarStock}
        />
      )}

      {/* 3. MÁQUINA CNC REALISTA E CLAMPS (CINEMÁTICA) */}
      <CncMachine3D
        x={estadoFresa.x}
        y={estadoFresa.y}
        z={estadoFresa.z}
        escala={escala}
        sheetWidth={sheetW}
        sheetDepth={sheetD}
        fixtures={fixtures}
        spindleOn={estadoFresa.spindleOn}
        rpm={estadoFresa.rpm}
        mostrarMaquina={mostrarMaquina}
        mostrarClamps={mostrarClamps}
      />

      {/* 4. RÉGUAS E GRADES MILIMÉTRICAS */}
      {habilitarGrade && (
        <Rulers3D sheetWidth={sheetW} sheetDepth={sheetD} escala={escala} cenaSize={Math.max(sheetW, sheetD)} habilitarGrade />
      )}

      {/* 5. COTAS DIMENSIONAIS */}
      {habilitarCotas && (
        <CotasDim layout={layout} escala={escala} pecaSelecionada={pecaSelecionadaObj} cenaSize={Math.max(sheetW, sheetD)} />
      )}

      {/* 6. RETALHOS E SOBRAS DE CHAPA */}
      {habilitarRetalhos && (
        <RetalhosVis3D layout={layout} escala={escala} cenaSize={Math.max(sheetW, sheetD)} />
      )}

      {/* 7. PEÇAS DO PLANO (Rótulo/Block) */}
      {/* Escondemos os blocos 3D originais se a visualização for puramente o Stock usinado,
          ou mostramos os blocos semi-transparentes para guiar visualmente */}
      {pecasComCor.map((peca) => (
        <PecaBlock
          key={peca.id}
          peca={peca}
          cor={mostrarStock ? `${peca.cor}44` : peca.cor} // mais transparente se tiver usinagem ativa
          escala={escala}
          selecionada={pecaSelecionada === peca.id}
          onClick={() => handleClickPeca(peca)}
        />
      ))}

      {/* 8. DESENHO DO TOOLPATH DE CORTE (CAM) */}
      <ToolpathPreview
        program={program}
        tempoAtual={tempoAtual}
        mostrarCaminho={!!mostrarCaminho}
      />
    </>
  );
});

function GerenciadorCamera({ layout }: { layout: LayoutSimulacao | null }) {
  const { camera } = useThree();
  const controls = useThree((state: any) => state.controls);
  const ultimoLayoutIdRef = useRef<string>('');

  useEffect(() => {
    if (!layout) return;

    const layoutId = `${layout.chapa.sku}_${layout.chapa.largura}_${layout.chapa.altura}_${layout.pecas.length}`;
    if (ultimoLayoutIdRef.current === layoutId) {
      return;
    }
    ultimoLayoutIdRef.current = layoutId;

    const escala = Math.max(layout.chapa.largura, layout.chapa.altura) / 10;
    const sheetW = layout.chapa.largura / escala;
    const sheetD = layout.chapa.altura / escala;
    const cx = sheetW / 2;
    const cz = sheetD / 2;

    camera.position.set(cx, 8, cz + 8);
    camera.lookAt(cx, 0, cz);
    camera.updateProjectionMatrix();

    if (controls) {
      controls.target.set(cx, 0, cz);
      controls.update();
    }
  }, [layout, camera, controls]);

  return null;
}

export default function CanvasSimulador3D({
  layout,
  onSelecionarPeca,
  habilitarGrade = true,
  habilitarCotas = true,
  habilitarAnimacao = false,
  habilitarRetalhos = true,
  mostrarMaquina = true,
  mostrarStock = true,
  mostrarClamps = true,
  mostrarCaminho = true,
  program,
  tempoAtual,
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
        mostrarMaquina={mostrarMaquina}
        mostrarStock={mostrarStock}
        mostrarClamps={mostrarClamps}
        mostrarCaminho={mostrarCaminho}
        program={program}
        tempoAtual={tempoAtual}
      />
    );
  }, [
    layout,
    habilitarGrade,
    habilitarCotas,
    habilitarAnimacao,
    habilitarRetalhos,
    mostrarMaquina,
    mostrarStock,
    mostrarClamps,
    mostrarCaminho,
    program,
    tempoAtual,
  ]);

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

  const escala = Math.max(layout.chapa.largura, layout.chapa.altura) / 10;
  const sheetW = layout.chapa.largura / escala;
  const sheetD = layout.chapa.altura / escala;
  const cx = sheetW / 2;
  const cz = sheetD / 2;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-[#1F2937] bg-[#0D1117] relative">
      <Canvas camera={CAMERA_CONFIG} gl={GL_CONFIG} onCreated={handleCreated}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[15, 20, 15]} intensity={0.8} />
        <directionalLight position={[-10, 10, -10]} intensity={0.3} />
        
        {scene}
        
        <GerenciadorCamera layout={layout} />
        
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.15}
          target={[cx, 0, cz]}
          minDistance={ORBIT_MIN_DIST}
          maxDistance={ORBIT_MAX_DIST}
        />
      </Canvas>
    </div>
  );
}
