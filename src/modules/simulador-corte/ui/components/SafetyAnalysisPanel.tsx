import React from 'react';
import { AlertTriangle, Crosshair, CheckCircle, XCircle, HelpCircle, ArrowRight, Shield, ShieldAlert, Cpu, RotateCw, Eye } from 'lucide-react';
import type { IssueWithRecommendation, SetupDiff, CollisionPolicy } from '../../domain/types';
import { determinarAcao } from '../../domain/adjustmentEngine';

interface SafetyAnalysisPanelProps {
  issuesWithRecs: IssueWithRecommendation[];
  diffs: SetupDiff[];
  collisionPolicy: CollisionPolicy;
  onJumpToIssue: (tempo: number, posicao: { x: number; y: number; z: number }) => void;
  onApplyRecommendation: (iwr: IssueWithRecommendation) => void;
  onRerunSimulation: () => void;
  isRerunning?: boolean;
  onPreviewRecommendation?: (iwr: IssueWithRecommendation | null) => void;
  onChangeCollisionPolicy?: (policy: CollisionPolicy) => void;
}

function formatarTempo(seg: number) {
  const mins = Math.floor(seg / 60);
  const secs = Math.floor(seg % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function SafetyAnalysisPanel({
  issuesWithRecs,
  diffs,
  collisionPolicy,
  onJumpToIssue,
  onApplyRecommendation,
  onRerunSimulation,
  isRerunning,
  onPreviewRecommendation,
  onChangeCollisionPolicy,
}: SafetyAnalysisPanelProps) {
  const podeAutoAplicar = collisionPolicy === 'auto';

  const totalErros = issuesWithRecs.filter(i => i.issue.severidade === 'error').length;
  const totalWarnings = issuesWithRecs.filter(i => i.issue.severidade === 'warning').length;
  const totalResolviveis = issuesWithRecs.filter(i => i.bestRecommendation && i.bestRecommendation.action !== 'impossible').length;
  const totalImpossiveis = issuesWithRecs.filter(i => i.bestRecommendation?.action === 'impossible').length;

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3 w-full flex flex-col gap-3 relative">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
        <h3 className="text-[#E2AC00] font-bold text-xs tracking-wider flex items-center gap-1.5">
          <ShieldAlert size={14} /> SEGURANÇA & AJUSTES
        </h3>
        <div className="flex gap-2">
          <span className="bg-[#EF4444]/20 text-[#EF4444] px-1.5 py-0.5 rounded text-[9px] font-bold">{totalErros} E</span>
          <span className="bg-[#F59E0B]/20 text-[#F59E0B] px-1.5 py-0.5 rounded text-[9px] font-bold">{totalWarnings} W</span>
        </div>
      </div>

      {diffs.length > 0 && (
        <div className="border-b border-[#1F2937]/60 pb-2">
          <h4 className="text-[#10B981] font-bold text-[10px] flex items-center gap-1 mb-1.5">
            <CheckCircle size={12} /> AJUSTES APLICADOS ({diffs.length})
          </h4>
          <div className="space-y-0.5">
            {diffs.map((d, i) => (
              <div key={i} className="flex items-center justify-between bg-[#0D1117]/60 rounded px-2 py-1 text-[9px] font-mono">
                <span className="text-[#6B7280]">{d.paramName}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[#EF4444]">{d.before}</span>
                  <ArrowRight size={10} className="text-[#10B981]" />
                  <span className="text-[#10B981] font-bold">{d.after}</span>
                  <span className="text-[#4b5563]">{d.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
        {issuesWithRecs.length === 0 ? (
          <div className="border border-dashed border-[#1F2937] rounded-xl flex items-center justify-center bg-[#0D1117]/40 p-4 text-center">
            <p className="text-[#10B981] font-semibold text-[10px] tracking-wide">
              <Shield size={14} className="inline-block mr-1" />
              NENHUMA ANOMALIA.<br/>SIMULAÇÃO SEGURA.
            </p>
          </div>
        ) : (
          issuesWithRecs.map((iwr) => {
            const issue = iwr.issue;
            const rec = iwr.bestRecommendation;
            const isError = issue.severidade === 'error';
            const acao = rec ? determinarAcao(rec, collisionPolicy) : 'block';
            const blocked = acao === 'block';

            return (
              <div
                key={issue.id}
                className="bg-[#0D1117]/60 border border-[#1F2937] rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => onJumpToIssue(issue.tempo, issue.posicao)}
                  className="w-full text-left p-2 hover:bg-[#1F2937]/30 transition-all flex flex-col gap-1 group"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={12} className={isError ? 'text-[#EF4444] shrink-0' : 'text-[#F59E0B] shrink-0'} />
                    <span className={`font-bold text-[10px] ${isError ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                      {issue.codigo}
                    </span>
                    <span className="text-[#4b5563] text-[8px] font-mono ml-auto">{formatarTempo(issue.tempo)}</span>
                  </div>
                  <p className="text-white font-medium text-[10px] leading-tight">{issue.mensagem}</p>
                  <p className="text-[#6B7280] text-[8px] line-clamp-2">{issue.descricao}</p>
                </button>

                {rec && (
                  <div className="border-t border-[#1F2937]/60 px-2 py-1.5">
                    <div className="flex items-start gap-1.5">
                      {!blocked ? (
                        acao === 'apply' ? (
                          <CheckCircle size={10} className="text-[#10B981] mt-0.5 shrink-0" />
                        ) : (
                          <HelpCircle size={10} className="text-[#E2AC00] mt-0.5 shrink-0" />
                        )
                      ) : (
                        <XCircle size={10} className="text-[#EF4444] mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] font-bold ${
                            !blocked ? (acao === 'apply' ? 'text-[#10B981]' : 'text-[#E2AC00]') : 'text-[#EF4444]'
                          }`}>
                            {!blocked ? (acao === 'apply' ? 'AUTO' : 'SUGESTÃO') : 'BLOQUEIO'}
                          </span>
                          <span className="text-[#6B7280] text-[8px]">
                            {blocked
                              ? `Política "${collisionPolicy === 'stop' ? 'Parar em Colisão' : collisionPolicy}" bloqueia ajuste automático`
                              : `${rec.paramName}: ${rec.oldValue} → ${rec.newValue}`}
                          </span>
                        </div>
                        <p className="text-[#6B7280] text-[8px] leading-tight mt-0.5">{rec.explanation}</p>
                        {rec.tradeoff && (
                          <p className="text-[#F59E0B] text-[8px] leading-tight mt-0.5 italic">{rec.tradeoff}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 mt-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onPreviewRecommendation?.(iwr); }}
                        className="flex items-center justify-center gap-1 bg-[#1F2937]/50 hover:bg-[#374151] text-[#6B7280] hover:text-white text-[8px] font-bold py-1 px-1.5 rounded transition-all"
                        title="Visualizar na cena 3D"
                      >
                        <Eye size={10} /> 3D
                      </button>
                      {!blocked ? (
                        acao === 'apply' ? (
                          <button
                            type="button"
                            onClick={() => onApplyRecommendation(iwr)}
                            className="flex-1 flex items-center justify-center gap-1 bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] text-[8px] font-bold py-1 rounded transition-all"
                          >
                            <CheckCircle size={10} /> APLICAR
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onApplyRecommendation(iwr)}
                            className="flex-1 flex items-center justify-center gap-1 bg-[#E2AC00]/20 hover:bg-[#E2AC00]/30 text-[#E2AC00] text-[8px] font-bold py-1 rounded transition-all"
                          >
                            <HelpCircle size={10} /> APLICAR SUGESTÃO
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onChangeCollisionPolicy?.(collisionPolicy === 'stop' ? 'suggest' : 'auto');
                          }}
                          className="flex-1 flex items-center justify-center gap-1 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] text-[8px] font-bold py-1 rounded transition-all"
                          title="Altere a política de colisão no painel CNC para desbloquear ajustes"
                        >
                          <XCircle size={10} /> MUDAR POLÍTICA
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isRerunning && (
        <div className="absolute inset-0 bg-[#111827]/90 flex flex-col items-center justify-center gap-2 z-10 rounded-xl">
          <RotateCw size={20} className="text-[#E2AC00] animate-spin" />
          <span className="text-[#E2AC00] font-bold text-[10px] animate-pulse">REEXECUTANDO SIMULAÇÃO...</span>
          <span className="text-[#6B7280] text-[8px]">REAVALIANDO SEGURANÇA COM NOVOS PARÂMETROS</span>
        </div>
      )}

      {(diffs.length > 0 || totalResolviveis > 0) && (
        <button
          type="button"
          onClick={onRerunSimulation}
          disabled={isRerunning}
          className="w-full flex items-center justify-center gap-1.5 bg-[#E2AC00] hover:bg-[#F5C200] text-black font-bold text-[10px] py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Cpu size={12} /> REEXECUTAR SIMULAÇÃO COM AJUSTES
        </button>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}
