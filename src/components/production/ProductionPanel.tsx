import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useCrmStore as useCRM } from '../../stores/useCrmStore';
import { ArrowLeft, Edit2, Trash2, Plus, X, Loader2 } from 'lucide-react';
import { WhatsAppService } from '../../modules/plano-corte/infrastructure/services/WhatsAppService';
import { Button, Card, CardContent, Input, Modal, Badge } from '../../components/common';

type StatusCol =
  | 'AGUARDANDO'
  | 'PRODUCAO'
  | 'MONTAGEM'
  | 'PINTURA'
  | 'INSPECAO'
  | 'PRONTO'
  | 'FINALIZADO';

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
}

interface OrdemProducao {
  id: string;
  op_id: string;
  produto: string;
  status: StatusCol;
  pecas: number;
  data_inicio?: string;
  data_fim?: string;
  data_prevista_entrega?: string;
  tempo_previsto_corte?: number;
  tempo_previsto_montagem?: number;
  checklist?: ChecklistItem[];
  projeto_id?: string;
}

const ProductionPanel: React.FC = () => {
  const [ops, setOps] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOP, setEditingOP] = useState<OrdemProducao | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [, setShowNewOPModal] = useState(false);
  const [newOPData, setNewOPData] = useState({
    op_id: '',
    produto: '',
    visita_id: '',
    projeto_id: '',
    quotation_id: '',
    pecas: 1,
  });
  const { error: toastError, success: toastSuccess } = useToast();
  const { projects, updateProject } = useCRM();

  const fetchOPs = async () => {
    try {
      const data = await api.production.list();
      setOps(data || []);
    } catch (e) {
      console.error('Erro ao buscar Ordens de Produção', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOPs();
    const interval = setInterval(fetchOPs, 10000);

    // Recarrega OPs imediatamente quando uma OP é criada/atualizada/excluída por outro módulo
    const onOpCreated = () => fetchOPs();
    const onOpUpdated = () => fetchOPs();
    const onOpDeleted = () => fetchOPs();
    window.addEventListener('op_created', onOpCreated as any);
    window.addEventListener('op_updated', onOpUpdated as any);
    window.addEventListener('op_deleted', onOpDeleted as any);
    return () => {
      clearInterval(interval);
      window.removeEventListener('op_created', onOpCreated as any);
      window.removeEventListener('op_updated', onOpUpdated as any);
      window.removeEventListener('op_deleted', onOpDeleted as any);
    };
  }, []);

  // Close modal with ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingOP(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingOP]);

  const updateStatus = async (op: OrdemProducao, direcao: 'avancar' | 'voltar') => {
    const fluxo: StatusCol[] = [
      'AGUARDANDO',
      'PRODUCAO',
      'MONTAGEM',
      'PINTURA',
      'INSPECAO',
      'PRONTO',
      'FINALIZADO',
    ];
    const index = fluxo.indexOf(op.status);
    let novoStatus: StatusCol;

    if (direcao === 'avancar') {
      const checklist = op.checklist || [];
      const isComplete = checklist.length === 0 || checklist.every((i) => i.completed);

      // also check piece-level operator_checked in metadata if available
      const anyMeta: any = (op as any).metadata || {};
      let piecesComplete = true;
      try {
        const pecas = Array.isArray(anyMeta.pecas) ? anyMeta.pecas : [];
        for (const p of pecas) {
          if (p && p.operator_checked === false) {
            piecesComplete = false;
            break;
          }
        }
      } catch (_e) {
        piecesComplete = true;
      }

      if (!isComplete || !piecesComplete) {
        toastError('Checklist ou peças pendentes', 'Conclua todas as tarefas antes de avançar.');
        return;
      }
      novoStatus = fluxo[index + 1] || op.status;
    } else {
      novoStatus = fluxo[index - 1] || op.status;
    }

    if (novoStatus === op.status) return;

    try {
      const updated = await api.production.updateStatus(op.op_id, novoStatus);
      if (updated) {
        setOps((prev) => prev.map((o) => (o.op_id === op.op_id ? updated : o)));

        // Notificações Inteligentes
        if (novoStatus === 'PRODUCAO') {
          await WhatsAppService.notificarProducaoIniciada(
            op.produto, // Simulado
            '4799999-9999',
            op.produto,
          );
        }

        if (novoStatus === 'PRONTO') {
          await api.notificacoes.generate();
          await WhatsAppService.notificarProjetoPronto(op.produto, '4799999-9999', op.produto);
        }
      }
    } catch (e: any) {
      console.error('Erro ao atualizar status da OP', e);
      toastError('Erro ao atualizar status', e.message);
    }
  };

  const saveOPDetails = async (updatedOP: OrdemProducao) => {
    try {
      const saved = await api.production.updateDetails(updatedOP);
      if (saved) {
        setOps((prev) => prev.map((o) => (o.op_id === updatedOP.op_id ? saved : o)));
        setEditingOP(null);
      }
    } catch (e: any) {
      toastError('Erro ao salvar detalhes', e.message);
    }
  };

  const deleteOP = useCallback(
    async (op_id: string) => {
      if (
        !confirm(
          'Deseja realmente excluir esta Ordem de Produção? Esta ação não pode ser desfeita.',
        )
      )
        return;
      setDeleting(true);
      try {
        const res = await fetch(`/api/production?op_id=${encodeURIComponent(op_id)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'Erro ao excluir OP');
        }
        setOps((prev) => prev.filter((o) => o.op_id !== op_id));
        setEditingOP(null);
      } catch (e: any) {
        toastError('Erro', e.message);
      } finally {
        setDeleting(false);
      }
    },
    [toastError],
  );

  const _createNewOP = async () => {
    if (!newOPData.op_id || !newOPData.produto) {
      toastError('Preencha o ID da OP e o Produto.');
      return;
    }
    try {
      await api.production.create(newOPData);
      setShowNewOPModal(false);
      setNewOPData({
        op_id: '',
        produto: '',
        visita_id: '',
        projeto_id: '',
        quotation_id: '',
        pecas: 1,
      });
      fetchOPs();
    } catch (e: any) {
      toastError('Erro ao criar OP', e.message);
    }
  };

  const colunas: { id: StatusCol; label: string; color: string }[] = [
    { id: 'AGUARDANDO', label: 'Aguardando', color: '#6b7280' },
    { id: 'PRODUCAO', label: 'Produção / Corte', color: '#f59e0b' },
    { id: 'MONTAGEM', label: 'Montagem / Acabamento', color: '#3b82f6' },
    { id: 'INSPECAO', label: 'Inspeção Final', color: '#ec4899' },
    { id: 'PRONTO', label: 'Pronto p/ Entrega', color: '#10b981' },
    { id: 'FINALIZADO', label: 'Finalizado', color: '#059669' },
  ];

  const handleVerMapaCorte = (op: OrdemProducao) => {
    // Redireciona para o plano de corte com o contexto do projeto/OP
    window.location.hash = `/plano-de-corte?projetoId=${op.projeto_id || ''}&opId=${op.op_id}`;
  };

  const defaultTasksByStatus: Record<string, string[]> = {
    AGUARDANDO: [],
    PRODUCAO: ['Corte', 'Fita de Borda', 'Furações'],
    MONTAGEM: ['Pré-Montagem', 'Pintura', 'Acabamento / Limpeza'],
    INSPECAO: ['Inspeção de Qualidade'],
    PRONTO: ['Embalagem'],
    FINALIZADO: [],
  };

  const calculateProgress = (op: OrdemProducao): number => {
    const tasks = defaultTasksByStatus[op.status] || [];
    const checklist = op.checklist || [];
    if (tasks.length === 0) return 0;
    const completed = checklist.filter((i) => i.completed).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const renderCard = (op: OrdemProducao, col: any) => {
    const checklist = op.checklist || [];
    const completed = checklist.filter((i) => i.completed).length;
    const tasks = defaultTasksByStatus[col.id] || [];
    const progress = calculateProgress(op);
    const allTasksDone = tasks.length === 0 || completed === tasks.length;

    return (
      <Card
        key={op.id}
        className="cursor-pointer hover:border-primary/40 transition-all shadow-md bg-card/60 flex flex-col gap-3"
        onClick={() => setEditingOP(op)}
      >
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-bold">#{op.op_id}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteOP(op.op_id);
                }}
                className="text-destructive opacity-60 hover:opacity-100 transition-opacity p-0.5"
                title="Excluir OP"
                aria-label={`Excluir ordem de produção ${op.op_id}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold py-0.5 px-2">
              {op.pecas} PEÃ‡AS
            </Badge>
          </div>

          <h4 className="text-sm font-bold text-foreground tracking-tight">{op.produto}</h4>

          {tasks.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] text-muted-foreground flex justify-between font-semibold">
                <span>TAREFAS</span>
                <span
                  className="font-bold"
                  style={{ color: progress === 100 ? 'var(--color-success, #10b981)' : col.color }}
                >
                  {progress}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: progress === 100 ? 'var(--color-success, #10b981)' : col.color,
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                {tasks.map((task, idx) => {
                  const taskItem = checklist.find((c) => c.task === task);
                  const isDone = !!taskItem?.completed;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 text-[10px] px-2 py-1 rounded-lg ${isDone ? 'bg-success/10 text-success' : 'bg-muted/30 text-muted-foreground'}`}
                    >
                      <span className="font-bold">{isDone ? 'âœ“' : 'â—‹'}</span>
                      <span className={isDone ? 'line-through' : ''}>{task}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-2 bg-muted/20 border border-border/30 rounded-xl flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">ðŸ“… Previsão:</span>
              <span
                className={`font-bold ${op.data_prevista_entrega && new Date(op.data_prevista_entrega).getTime() < Date.now() ? 'text-destructive animate-pulse' : 'text-foreground'}`}
              >
                {op.data_prevista_entrega
                  ? new Date(op.data_prevista_entrega).toLocaleDateString('pt-BR')
                  : '--'}
              </span>
            </div>
            {op.data_prevista_entrega &&
              new Date(op.data_prevista_entrega).getTime() < Date.now() && (
                <div className="text-[9px] text-destructive font-extrabold text-right">
                  âš ï¸ EM ATRASO
                </div>
              )}
          </div>

          {['PRODUCAO', 'MONTAGEM'].includes(op.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleVerMapaCorte(op);
              }}
              className="w-full text-xs font-bold gap-2 text-primary hover:text-primary-foreground border-primary/20 hover:border-primary"
            >
              <Edit2 size={12} /> VER MAPA DE CORTE
            </Button>
          )}

          <div
            className="flex justify-between items-center mt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {col.id !== 'AGUARDANDO' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus(op, 'voltar')}
                  className="p-1 h-7 w-7 text-muted-foreground"
                  aria-label={`Voltar status da OP ${op.op_id}`}
                >
                  <ArrowLeft size={12} />
                </Button>
              )}
            </div>
            {col.id !== 'FINALIZADO' &&
              (() => {
                const canAdvance = allTasksDone;
                return (
                  <Button
                    size="sm"
                    onClick={() =>
                      canAdvance
                        ? updateStatus(op, 'avancar')
                        : toastError(
                            'Checklist ou peças pendentes',
                            'Conclua todas as tarefas antes de avançar.',
                          )
                    }
                    disabled={!canAdvance}
                    title={!canAdvance ? 'Checklist ou peças pendentes' : 'Avançar OP'}
                    className={`text-[10px] font-extrabold px-3 py-1 h-7 ${canAdvance ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    AVANÃ‡AR â†’
                  </Button>
                );
              })()}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading && ops.length === 0) {
    return (
      <div className="py-20 flex flex-col justify-center items-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="text-sm font-semibold tracking-wider">
          Sincronizando com chão de fábrica...
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-10 pt-2 custom-scrollbar">
      {colunas.map((col) => {
        const colOps = ops.filter((o) => {
          const s = (o.status || '').toUpperCase();
          if (col.id === 'AGUARDANDO') return s === 'AGUARDANDO' || s === 'PENDENTE';
          if (col.id === 'PRODUCAO') return s === 'PRODUCAO' || s === 'CORTE' || s === 'FABRICACAO';
          return s === col.id;
        });
        const colProjects =
          col.id === 'AGUARDANDO'
            ? (projects || []).filter(
                (p) => ['aprovado', 'em_producao'].includes(p.status) && !p.ordem_producao_id,
              )
            : [];

        return (
          <div
            key={col.id}
            className="flex-shrink-0 w-[320px] min-h-[75vh] flex flex-col gap-4 bg-card/40 border border-border rounded-2xl p-4 shadow-sm"
          >
            <header className="flex justify-between items-center border-b border-border/50 pb-3">
              <h2
                className="text-xs font-extrabold uppercase tracking-widest"
                style={{ color: col.color }}
              >
                {col.label}
              </h2>
              <Badge variant="secondary" className="font-extrabold text-[11px]">
                {colOps.length + colProjects.length}
              </Badge>
            </header>
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] pr-1 custom-scrollbar">
              {colProjects.map((project) => (
                <Card key={project.id} className="border border-border bg-card/60">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground font-bold">
                        {project.tag || `#${project.id?.substring(0, 8)}`}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-bold text-success border-success/20 bg-success/5"
                      >
                        {project.status === 'aprovado' ? 'APROVADO' : 'EM PROD'}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-bold text-foreground">{project.ambiente}</h4>
                    <p className="text-[11px] text-muted-foreground">{project.clientName}</p>
                    <Button
                      size="sm"
                      className="w-full text-xs font-bold"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm('Gerar Ordem de Produção para este projeto?')) return;
                        try {
                          const opId = `OP-${project.id?.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
                          const res = await fetch('/api/production', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              op_id: opId,
                              produto: project.ambiente || 'Produto',
                              pecas: 1,
                              projeto_id: project.id,
                              visita_id: project.visitaId || null,
                              quotation_id: project.orcamentoId || null,
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Erro ao criar OP');
                          await updateProject(project.id, {
                            status: 'em_producao',
                            etapaProducao: 'corte',
                            ordem_producao_id: opId,
                          });
                          fetchOPs();
                          toastSuccess(`OP ${opId} criada!`);
                        } catch (e: any) {
                          toastError('Erro', e.message);
                        }
                      }}
                    >
                      ðŸ”¨ Gerar OP
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {colOps.map((op) => renderCard(op, col))}
            </div>
          </div>
        );
      })}

      {/* Modal de Edição Industrial */}
      {editingOP && (
        <Modal
          isOpen={!!editingOP}
          onClose={() => setEditingOP(null)}
          title={`DETALHES DA ORDEM #${editingOP.op_id}`}
          size="xl"
        >
          <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">
                Configure as tarefas e confira as peças.
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteOP(editingOP.op_id)}
                disabled={deleting}
                className="font-bold flex items-center gap-1.5"
              >
                <Trash2 size={14} /> EXCLUIR ORDEM
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6">
              <div className="flex flex-col gap-5">
                <Input
                  label="PRODUTO / AMBIENTE"
                  value={editingOP.produto}
                  onChange={(e) => setEditingOP({ ...editingOP, produto: e.target.value })}
                />

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      CHECKLIST DE QUALIDADE (MANDATÃ“RIO)
                    </label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEditingOP({
                          ...editingOP,
                          checklist: [
                            ...(editingOP.checklist || []),
                            { id: crypto.randomUUID(), task: '', completed: false },
                          ],
                        })
                      }
                      className="text-xs font-bold h-8 flex items-center gap-1"
                    >
                      <Plus size={14} /> Tarefa
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                    {(editingOP.checklist || []).length === 0 && (
                      <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                        Nenhuma tarefa de conferência definida.
                      </div>
                    )}
                    {(editingOP.checklist || []).map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-muted/20 border border-border/30 p-2.5 rounded-xl"
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                          onChange={(e) => {
                            const newCheck = [...(editingOP.checklist || [])];
                            newCheck[idx].completed = e.target.checked;
                            setEditingOP({ ...editingOP, checklist: newCheck });
                          }}
                        />
                        <input
                          value={item.task}
                          onChange={(e) => {
                            const newCheck = [...(editingOP.checklist || [])];
                            newCheck[idx].task = e.target.value;
                            setEditingOP({ ...editingOP, checklist: newCheck });
                          }}
                          placeholder="Descrição da tarefa"
                          className={`flex-1 bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-sm ${item.completed ? 'text-muted-foreground line-through' : 'text-foreground font-medium'}`}
                        />
                        <button
                          onClick={() => {
                            const newCheck = (editingOP.checklist || []).filter(
                              (_, i) => i !== idx,
                            );
                            setEditingOP({ ...editingOP, checklist: newCheck });
                          }}
                          className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors"
                          aria-label="Remover item do checklist"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 flex flex-col gap-3">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    ðŸ“¦ ENGENHARIA E MATERIAIS
                  </label>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {(editingOP as any).metadata?.materiais?.map((m: any, i: number) => (
                      <div
                        key={i}
                        className="text-xs flex justify-between p-3 bg-muted/20 border border-border/20 rounded-xl"
                      >
                        <span className="font-medium text-foreground">{m.descricao}</span>
                        <Badge variant="secondary" className="font-extrabold text-[10px]">
                          {m.quantidade}
                          {m.unidade || ''}
                        </Badge>
                      </div>
                    )) || (
                      <div className="text-xs text-muted-foreground py-4 text-center">
                        Sem dados de materiais
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t md:border-t-0 md:border-l border-border/50 md:pl-6 flex flex-col gap-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  ðŸ“ LISTA DE CORTE / PEÃ‡AS
                </label>
                <div className="max-h-[420px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-2">
                  {((editingOP as any).metadata?.pecas || []).length === 0 && (
                    <div className="text-xs text-muted-foreground py-4 text-center">
                      Sem lista de peças
                    </div>
                  )}
                  {((editingOP as any).metadata?.pecas || []).map((p: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-3 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={!!p.operator_checked}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            const newMeta = { ...(editingOP as any).metadata };
                            const newPecas = Array.isArray(newMeta.pecas) ? [...newMeta.pecas] : [];
                            newPecas[i] = { ...newPecas[i], operator_checked: checked };
                            newMeta.pecas = newPecas;

                            const nextEditing = { ...editingOP, metadata: newMeta } as any;
                            setEditingOP(nextEditing);

                            try {
                              const saved = await api.production.updateDetails({
                                op_id: nextEditing.op_id,
                                metadata: nextEditing.metadata,
                              });
                              setOps((prev) =>
                                prev.map((o) => (o.op_id === saved.op_id ? saved : o)),
                              );
                              setEditingOP(saved as any);
                            } catch (err: any) {
                              console.error('Erro salvando metadata da OP:', err);
                              toastError('Erro ao salvar conferência da peça', err.message || err);
                            }
                          }}
                        />
                        <span className="text-sm font-semibold text-foreground">{p.nome}</span>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {p.largura}x{p.altura}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border/50 pt-4 mt-2">
              <Button variant="secondary" onClick={() => setEditingOP(null)} className="font-bold">
                CANCELAR
              </Button>
              <Button onClick={() => saveOPDetails(editingOP)} className="font-bold px-6">
                SALVAR OP
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProductionPanel;
