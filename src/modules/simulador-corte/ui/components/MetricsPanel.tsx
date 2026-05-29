import React from 'react';
import { Gauge, Activity, AlertTriangle, Cpu, Crosshair, HardDrive, Trash2, CheckCircle, Eye } from 'lucide-react';
import type { SimulationProgram, SimulationMetrics, SimulationIssue } from '../../domain/types';
import type { IssueWithRecommendation } from '../../domain/types';

interface MetricsPanelProps {
  program: SimulationProgram;
  metrics: SimulationMetrics;
  tempoAtual: number;
  posicaoAtual: { x: number; y: number; z: number; spindleOn: boolean; rpm: number; tipoMovimento: string };
  onJumpToIssue: (tempo: number, posicao: { x: number; y: number; z: number }) => void;
  issuesWithRecs?: IssueWithRecommendation[];
  onApplyRecommendation?: (iwr: IssueWithRecommendation) => void;
}

export default function MetricsPanel({
  program,
  metrics,
  tempoAtual,
  posicaoAtual,
  onJumpToIssue,
  issuesWithRecs,
  onApplyRecommendation,
}: MetricsPanelProps) {
  // Formata tempo (segundos) em MM:SS ou HH:MM:SS
  const formatarTempo = (seg: number) => {
    const hrs = Math.floor(seg / 3600);
    const mins = Math.floor((seg % 3600) / 60);
    const secs = Math.floor(seg % 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const eficienca = metrics.tempoTotal > 0
    ? ((metrics.tempoCorte / metrics.tempoTotal) * 100).toFixed(1)
    : '0';

  // Conversão de mm³ para cm³ de cavacos de MDF gerados
  const cavacosCm3 = (metrics.volumeRemovidoMm3 / 1000).toFixed(1);

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 w-full flex flex-col gap-4 text-xs">
      
      {/* 1. MÁQUINA EM TEMPO REAL (COORDENADAS E DADOS DO SPINDLE) */}
      <div className="border-b border-[#1F2937] pb-3">
        <h3 className="text-[#E2AC00] font-bold text-xs tracking-wider mb-2.5 flex items-center gap-1.5">
          <Cpu size={14} /> STATUS CNC EM TEMPO REAL
        </h3>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="bg-[#0D1117] border border-[#1F2937] p-2 rounded-lg text-center font-mono">
            <span className="text-[#6B7280] block text-[9px]">EIXO X</span>
            <span className="text-white text-sm font-semibold">{posicaoAtual.x.toFixed(1)}</span>
            <span className="text-[#4b5563] text-[9px] ml-0.5">mm</span>
          </div>
          <div className="bg-[#0D1117] border border-[#1F2937] p-2 rounded-lg text-center font-mono">
            <span className="text-[#6B7280] block text-[9px]">EIXO Y</span>
            <span className="text-white text-sm font-semibold">{posicaoAtual.y.toFixed(1)}</span>
            <span className="text-[#4b5563] text-[9px] ml-0.5">mm</span>
          </div>
          <div className="bg-[#0D1117] border border-[#1F2937] p-2 rounded-lg text-center font-mono">
            <span className="text-[#6B7280] block text-[9px]">EIXO Z</span>
            <span className="text-white text-sm font-semibold">{posicaoAtual.z.toFixed(1)}</span>
            <span className="text-[#4b5563] text-[9px] ml-0.5">mm</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex items-center justify-between bg-[#0D1117] border border-[#1F2937] px-2.5 py-1.5 rounded-lg text-white font-mono">
            <span className="text-[#6B7280]">SPINDLE:</span>
            <span className={posicaoAtual.spindleOn ? 'text-[#10B981] font-bold' : 'text-[#EF4444] font-bold'}>
              {posicaoAtual.spindleOn ? 'LIGADO' : 'DESLIGADO'}
            </span>
          </div>
          <div className="flex items-center justify-between bg-[#0D1117] border border-[#1F2937] px-2.5 py-1.5 rounded-lg text-white font-mono">
            <span className="text-[#6B7280]">VELOCIDADE:</span>
            <span className="text-white font-semibold">{posicaoAtual.rpm} RPM</span>
          </div>
        </div>
      </div>

      {/* 2. MÉTRICAS DO CICLO CNC */}
      <div className="border-b border-[#1F2937] pb-3">
        <h3 className="text-[#E2AC00] font-bold text-xs tracking-wider mb-2.5 flex items-center gap-1.5">
          <Gauge size={14} /> METRICAS DO CICLO
        </h3>
        <div className="space-y-1.5 font-mono text-white text-[10px]">
          <div className="flex justify-between items-center bg-[#0D1117]/40 px-2 py-1 rounded">
            <span className="text-[#6B7280]">Tempo de Ciclo Total:</span>
            <span className="font-bold">{formatarTempo(metrics.tempoTotal)}</span>
          </div>
          <div className="flex justify-between items-center bg-[#0D1117]/40 px-2 py-1 rounded">
            <span className="text-[#6B7280]">Tempo em Corte Ativo:</span>
            <span className="text-[#10B981] font-semibold">{formatarTempo(metrics.tempoCorte)}</span>
          </div>
          <div className="flex justify-between items-center bg-[#0D1117]/40 px-2 py-1 rounded">
            <span className="text-[#6B7280]">Tempo em Vazio (Rapido):</span>
            <span className="text-[#3b82f6] font-semibold">{formatarTempo(metrics.tempoRapido)}</span>
          </div>
          <div className="flex justify-between items-center bg-[#0D1117]/40 px-2 py-1 rounded">
            <span className="text-[#6B7280]">Eficiência Operacional:</span>
            <span className="text-[#E2AC00] font-bold">{eficienca}%</span>
          </div>
          <div className="flex justify-between items-center bg-[#0D1117]/40 px-2 py-1 rounded">
            <span className="text-[#6B7280]">Distância Total Percorrida:</span>
            <span>{(metrics.distanciaTotal / 1000).toFixed(2)} m</span>
          </div>
          <div className="flex justify-between items-center bg-[#0D1117]/40 px-2 py-1 rounded">
            <span className="text-[#6B7280]">Volume de MDF Removido:</span>
            <span className="text-[#F59E0B]">{cavacosCm3} cm³</span>
          </div>
          <div className="flex justify-between items-center bg-[#0D1117]/40 px-2 py-1 rounded">
            <span className="text-[#6B7280]">Área de Desperdício/Sobra:</span>
            <span>{metrics.areaDesperdicioM2.toFixed(2)} m²</span>
          </div>
        </div>
      </div>

      {/* 3. VERIFICAÇÃO DE ERROS E SEGURANÇA */}
      <div className="flex-1 flex flex-col min-h-[160px]">
        <h3 className="text-[#E2AC00] font-bold text-xs tracking-wider mb-2 flex items-center gap-1.5 justify-between">
          <span className="flex items-center gap-1.5"><Activity size={14} /> ANÁLISE DE SEGURANÇA</span>
          <div className="flex gap-2">
            <span className="bg-[#EF4444]/20 text-[#EF4444] px-1.5 py-0.5 rounded text-[9px] font-bold">{metrics.numErros} E</span>
            <span className="bg-[#F59E0B]/20 text-[#F59E0B] px-1.5 py-0.5 rounded text-[9px] font-bold">{metrics.numWarnings} W</span>
          </div>
        </h3>

        {program.issues.length === 0 ? (
          <div className="flex-1 border border-dashed border-[#1F2937] rounded-xl flex items-center justify-center bg-[#0D1117]/40 p-4 text-center">
            <p className="text-[#10B981] font-semibold text-[10px] tracking-wide">NENHUMA ANOMALIA DETECTADA.<br/>CÓDIGO G-CODE INTEGRAL.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto max-h-[220px] custom-scrollbar border border-[#1F2937] rounded-lg bg-[#0D1117]/30 divide-y divide-[#1F2937] pr-1">
            {program.issues.map((issue) => {
              const isError = issue.severidade === 'error';
              const matchingIwr = issuesWithRecs?.find((iwr) => iwr.issue.id === issue.id && iwr.bestRecommendation && iwr.bestRecommendation.action !== 'impossible');
              return (
                <div
                  key={issue.id}
                  className="w-full text-left p-2 hover:bg-[#1F2937]/50 transition-all flex flex-col gap-1 group"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="p-0.5 rounded bg-black/40">
                      <AlertTriangle size={12} className={isError ? 'text-[#EF4444]' : 'text-[#F59E0B]'} />
                    </span>
                    <span className={`font-bold text-[10px] ${isError ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                      {issue.codigo}
                    </span>
                    <span className="text-[#4b5563] text-[9px] font-mono ml-auto">
                      {formatarTempo(issue.tempo)}
                    </span>
                  </div>
                  <p className="text-white font-medium text-[10px] leading-tight group-hover:text-[#E2AC00] transition-colors">
                    {issue.mensagem}
                  </p>
                  <p className="text-[#6B7280] text-[9px] leading-normal truncate">
                    {issue.descricao}
                  </p>
                  <div className="flex gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onJumpToIssue(issue.tempo, issue.posicao); }}
                      className="flex items-center gap-1 bg-[#1F2937]/50 hover:bg-[#374151] text-[#6B7280] hover:text-white text-[8px] font-bold py-1 px-2 rounded transition-all"
                      title="PULAR PARA O ERRO NO CÓDIGO/CENA 3D"
                    >
                      <Crosshair size={10} /> JUMP
                    </button>
                    {matchingIwr && onApplyRecommendation && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onApplyRecommendation(matchingIwr); }}
                        className="flex items-center gap-1 bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] text-[8px] font-bold py-1 px-2 rounded transition-all"
                        title="CORRIGIR E FAZER O ERRO DESAPARECER"
                      >
                        <CheckCircle size={10} /> CORRIGIR
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
      `}</style>
    </div>
  );
}
