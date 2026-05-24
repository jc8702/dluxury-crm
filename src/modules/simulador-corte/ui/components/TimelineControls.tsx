import React, { useMemo } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, AlertTriangle, XOctagon } from 'lucide-react';
import type { SimulationProgram, SimulationIssue } from '../../domain/types';

interface TimelineControlsProps {
  program: SimulationProgram;
  tempoAtual: number;
  onTempoChange: (tempo: number) => void;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  velocidade: number;
  onVelocidadeChange: (vel: number) => void;
  stopOnCollision: boolean;
  onStopOnCollisionChange: (stop: boolean) => void;
}

export default function TimelineControls({
  program,
  tempoAtual,
  onTempoChange,
  playing,
  onPlayingChange,
  velocidade,
  onVelocidadeChange,
  stopOnCollision,
  onStopOnCollisionChange,
}: TimelineControlsProps) {
  const totalTempo = program.totalTempoEstimado || 1;

  // Formata tempo (segundos) em MM:SS
  const formatarTempo = (seg: number) => {
    const mins = Math.floor(seg / 60);
    const secs = Math.floor(seg % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Marcadores de Issues na timeline (posição percentual do tempo)
  const issueMarkers = useMemo(() => {
    return program.issues.map((issue) => {
      const pct = (issue.tempo / totalTempo) * 100;
      const isError = issue.severidade === 'error';
      return {
        ...issue,
        pct,
        color: isError ? '#EF4444' : '#F59E0B', // Vermelho para erro, amarelo para warning
      };
    });
  }, [program.issues, totalTempo]);

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTempoChange(Number(e.target.value));
  };

  const handleStep = (direcao: number) => {
    const passo = 1.0; // 1 segundo
    const novoTempo = Math.max(0, Math.min(totalTempo, tempoAtual + direcao * passo));
    onTempoChange(novoTempo);
  };

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 w-full flex flex-col gap-3">
      {/* 1. LINHA DO TEMPO (SCRUBBER) COM ISSUES */}
      <div className="relative w-full flex items-center pt-2">
        <input
          type="range"
          min={0}
          max={totalTempo}
          step={0.1}
          value={tempoAtual}
          onChange={handleScrubberChange}
          className="w-full h-2 rounded-lg bg-[#1F2937] accent-[#E2AC00] cursor-pointer outline-none transition-all duration-100"
        />

        {/* Marcadores de Colisões/Erros e Warnings em cima da timeline */}
        <div className="absolute top-[8px] left-0 right-0 h-2 pointer-events-none w-full">
          {issueMarkers.map((marker) => (
            <button
              key={marker.id}
              onClick={(e) => {
                e.stopPropagation();
                onTempoChange(marker.tempo);
              }}
              className="absolute w-2.5 h-2.5 -translate-x-1/2 -top-[1px] rounded-full flex items-center justify-center cursor-pointer pointer-events-auto hover:scale-150 transition-transform"
              style={{
                left: `${marker.pct}%`,
                backgroundColor: marker.color,
                border: '1px solid #111827',
              }}
              title={`${marker.codigo}: ${marker.mensagem} (${formatarTempo(marker.tempo)})`}
            >
              {marker.severidade === 'error' ? (
                <span className="w-1 h-1 bg-white rounded-full block" />
              ) : (
                <span className="w-1 h-1 bg-black rounded-full block" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 2. BARRA DE CONTROLES */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Controles de Reprodução */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStep(-1)}
            className="p-2 hover:bg-[#1F2937] rounded-lg text-[#6B7280] hover:text-white transition-all"
            title="Recuar 1s"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={() => onPlayingChange(!playing)}
            className="p-2.5 bg-[#E2AC00] hover:bg-[#F5C200] text-black rounded-lg font-bold flex items-center justify-center transition-all"
            title={playing ? 'Pausar Simulação' : 'Iniciar Simulação'}
          >
            {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>

          <button
            onClick={() => handleStep(1)}
            className="p-2 hover:bg-[#1F2937] rounded-lg text-[#6B7280] hover:text-white transition-all"
            title="Avançar 1s"
          >
            <ChevronRight size={16} />
          </button>

          <button
            onClick={() => {
              onPlayingChange(false);
              onTempoChange(0);
            }}
            className="p-2 hover:bg-[#1F2937] rounded-lg text-[#6B7280] hover:text-white transition-all"
            title="Resetar Simulação"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Marcador de Tempo Digital */}
        <div className="flex items-center gap-1.5 font-mono text-white text-xs bg-[#0D1117] px-3 py-1.5 rounded-lg border border-[#1F2937]">
          <span className="text-[#E2AC00] font-semibold">{formatarTempo(tempoAtual)}</span>
          <span className="text-[#4b5563]">/</span>
          <span className="text-[#9ca3af]">{formatarTempo(totalTempo)}</span>
        </div>

        {/* Controles de velocidade e segurança */}
        <div className="flex items-center gap-4">
          {/* Multiplicador de Velocidade */}
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">VELOCIDADE:</span>
            <select
              value={velocidade}
              onChange={(e) => onVelocidadeChange(Number(e.target.value))}
              className="bg-[#0D1117] border border-[#1F2937] text-white rounded-lg px-2 py-1 outline-none text-xs focus:border-[#E2AC00] font-medium"
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1.0x (Real)</option>
              <option value={2}>2.0x</option>
              <option value={5}>5.0x</option>
            </select>
          </div>

          {/* Habilitar parar em colisão */}
          <label className="flex items-center gap-2 text-[#6B7280] cursor-pointer hover:text-white select-none transition-colors">
            <input
              type="checkbox"
              checked={stopOnCollision}
              onChange={(e) => onStopOnCollisionChange(e.target.checked)}
              className="rounded bg-[#0D1117] border-[#1F2937] text-[#E2AC00] focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
            />
            PARAR EM COLISÃO
          </label>
        </div>
      </div>
    </div>
  );
}
