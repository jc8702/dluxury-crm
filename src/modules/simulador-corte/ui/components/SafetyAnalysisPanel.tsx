import React from 'react';
import {
  AlertTriangle,
  Crosshair,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Shield,
  ShieldAlert,
  Cpu,
  RotateCw,
  Eye,
} from 'lucide-react';
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

  const totalErros = issuesWithRecs.filter((i) => i.issue.severidade === 'error').length;
  const totalWarnings = issuesWithRecs.filter((i) => i.issue.severidade === 'warning').length;
  const totalResolviveis = issuesWithRecs.filter(
    (i) => i.bestRecommendation && i.bestRecommendation.action !== 'impossible',
  ).length;
  const totalImpossiveis = issuesWithRecs.filter(
    (i) => i.bestRecommendation?.action === 'impossible',
  ).length;

  return (
    <div className="bg-card border border-border rounded-xl p-3 w-full flex flex-col gap-3 relative">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-accent font-bold text-xs tracking-wider flex items-center gap-1.5">
          <ShieldAlert size={14} /> SEGURANÇA & AJUSTES
        </h3>
        <div className="flex gap-2">
          <span className="bg-destructive/20 text-destructive px-1.5 py-0.5 rounded text-sm font-bold">
            {totalErros} E
          </span>
          <span className="bg-warning/20 text-warning px-1.5 py-0.5 rounded text-sm font-bold">
            {totalWarnings} W
          </span>
        </div>
      </div>

      {diffs.length > 0 && (
        <div className="border-b border-border/60 pb-2">
          <h4 className="text-success font-bold text-sm flex items-center gap-1 mb-1.5">
            <CheckCircle size={12} /> AJUSTES APLICADOS ({diffs.length})
          </h4>
          <div className="space-y-0.5">
            {diffs.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-background/60 rounded px-2 py-1 text-sm font-mono"
              >
                <span className="text-muted-foreground">{d.paramName}</span>
                <div className="flex items-center gap-1">
                  <span className="text-destructive">{d.before}</span>
                  <ArrowRight size={10} className="text-success" />
                  <span className="text-success font-bold">{d.after}</span>
                  <span className="text-muted-foreground">{d.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
        {issuesWithRecs.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl flex items-center justify-center bg-background/40 p-4 text-center">
            <p className="text-success font-semibold text-sm tracking-wide">
              <Shield size={14} className="inline-block mr-1" />
              NENHUMA ANOMALIA.
              <br />
              SIMULAÇÃO SEGURA.
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
                className="bg-background/60 border border-border rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => onJumpToIssue(issue.tempo, issue.posicao)}
                  className="w-full text-left p-2 hover:bg-muted/30 transition-all flex flex-col gap-1 group"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle
                      size={12}
                      className={isError ? 'text-destructive shrink-0' : 'text-warning shrink-0'}
                    />
                    <span
                      className={`font-bold text-sm ${isError ? 'text-destructive' : 'text-warning'}`}
                    >
                      {issue.codigo}
                    </span>
                    <span className="text-muted-foreground text-sm font-mono ml-auto">
                      {formatarTempo(issue.tempo)}
                    </span>
                  </div>
                  <p className="text-foreground font-medium text-sm leading-tight">
                    {issue.mensagem}
                  </p>
                  <p className="text-muted-foreground text-sm line-clamp-2">{issue.descricao}</p>
                </button>

                {rec && (
                  <div className="border-t border-border/60 px-2 py-1.5">
                    <div className="flex items-start gap-1.5">
                      {!blocked ? (
                        acao === 'apply' ? (
                          <CheckCircle size={10} className="text-success mt-0.5 shrink-0" />
                        ) : (
                          <HelpCircle size={10} className="text-accent mt-0.5 shrink-0" />
                        )
                      ) : (
                        <XCircle size={10} className="text-destructive mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-sm font-bold ${
                              !blocked
                                ? acao === 'apply'
                                  ? 'text-success'
                                  : 'text-accent'
                                : 'text-destructive'
                            }`}
                          >
                            {!blocked ? (acao === 'apply' ? 'AUTO' : 'SUGESTÃO') : 'BLOQUEIO'}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {blocked
                              ? `Política "${collisionPolicy === 'stop' ? 'Parar em Colisão' : collisionPolicy}" bloqueia ajuste automático`
                              : `${rec.paramName}: ${rec.oldValue} → ${rec.newValue}`}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm leading-tight mt-0.5">
                          {rec.explanation}
                        </p>
                        {rec.tradeoff && (
                          <p className="text-warning text-sm leading-tight mt-0.5 italic">
                            {rec.tradeoff}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 mt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewRecommendation?.(iwr);
                        }}
                        className="flex items-center justify-center gap-1 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-sm font-bold py-1 px-1.5 rounded transition-all"
                        title="Visualizar na cena 3D"
                      >
                        <Eye size={10} /> 3D
                      </button>
                      {!blocked ? (
                        acao === 'apply' ? (
                          <button
                            type="button"
                            onClick={() => onApplyRecommendation(iwr)}
                            className="flex-1 flex items-center justify-center gap-1 bg-success/20 hover:bg-success/30 text-success text-sm font-bold py-1 rounded transition-all"
                          >
                            <CheckCircle size={10} /> APLICAR
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onApplyRecommendation(iwr)}
                            className="flex-1 flex items-center justify-center gap-1 bg-accent/20 hover:bg-accent/30 text-accent text-sm font-bold py-1 rounded transition-all"
                          >
                            <HelpCircle size={10} /> APLICAR SUGESTÃO
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onChangeCollisionPolicy?.(
                              collisionPolicy === 'stop' ? 'suggest' : 'auto',
                            );
                          }}
                          className="flex-1 flex items-center justify-center gap-1 bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-bold py-1 rounded transition-all"
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
        <div className="absolute inset-0 bg-card/90 flex flex-col items-center justify-center gap-2 z-10 rounded-xl">
          <RotateCw size={20} className="text-accent animate-spin" />
          <span className="text-accent font-bold text-sm animate-pulse">
            REEXECUTANDO SIMULAÇÃO...
          </span>
          <span className="text-muted-foreground text-sm">
            REAVALIANDO SEGURANÇA COM NOVOS PARÂMETROS
          </span>
        </div>
      )}

      {(diffs.length > 0 || totalResolviveis > 0) && (
        <button
          type="button"
          onClick={onRerunSimulation}
          disabled={isRerunning}
          className="w-full flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-sm py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Cpu size={12} /> REEXECUTAR SIMULAÇÃO COM AJUSTES
        </button>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.45); border-radius: 4px; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}
