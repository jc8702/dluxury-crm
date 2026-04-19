import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAppContext } from '../../context/AppContext';
import { CheckSquare, ArrowLeft, ArrowRight, Edit2, Play, CheckCircle2, Trash2, Plus, X } from 'lucide-react';

type StatusCol = "PENDENTE" | "CORTE" | "MONTAGEM" | "FINALIZADA";

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
}

const ProductionPanel: React.FC = () => {
  const [ops, setOps] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOP, setEditingOP] = useState<OrdemProducao | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const fluxo: StatusCol[] = ["PENDENTE", "CORTE", "MONTAGEM", "FINALIZADA"];
    const index = fluxo.indexOf(op.status);
    let novoStatus: StatusCol;

    if (direcao === 'avancar') {
      const checklist = op.checklist || [];
      const isComplete = checklist.length === 0 || checklist.every(i => i.completed);

      // also check piece-level operator_checked in metadata if available
      const anyMeta: any = (op as any).metadata || {};
      let piecesComplete = true;
      try {
        const pecas = Array.isArray(anyMeta.pecas) ? anyMeta.pecas : [];
        for (const p of pecas) {
          if (p && p.operator_checked === false) { piecesComplete = false; break; }
        }
      } catch (e) { piecesComplete = true; }

      if (!isComplete || !piecesComplete) {
        alert("⚠️ Checklist ou peças pendentes! Conclua todas as tarefas antes de avançar.");
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
        setOps(prev => prev.map(o => o.op_id === op.op_id ? updated : o));
      }
    } catch (e: any) {
      console.error('Erro ao atualizar status da OP', e);
      alert("Erro ao atualizar status: " + e.message);
    }
  };

  const saveOPDetails = async (updatedOP: OrdemProducao) => {
    try {
      const saved = await api.production.updateDetails(updatedOP);
      if (saved) {
        setOps(prev => prev.map(o => o.op_id === updatedOP.op_id ? saved : o));
        setEditingOP(null);
      }
    } catch (e: any) {
      alert("Erro ao salvar detalhes: " + e.message);
    }
  };

  const deleteOP = useCallback(async (op_id: string) => {
    if (!confirm('Deseja realmente excluir esta Ordem de Produção? Esta ação não pode ser desfeita.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/production?op_id=${encodeURIComponent(op_id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Erro ao excluir OP');
      }
      setOps(prev => prev.filter(o => o.op_id !== op_id));
      setEditingOP(null);
      try { window.dispatchEvent(new CustomEvent('op_deleted', { detail: { op_id } })); } catch (e) {}
    } catch (e: any) {
      alert('Erro ao excluir OP: ' + e.message);
    } finally {
      setDeleting(false);
    }
  }, []);

  const colunas: { id: StatusCol, label: string, color: string }[] = [
    { id: "PENDENTE", label: "Aguardando", color: "var(--text-muted)" },
    { id: "CORTE", label: "Corte / Preparação", color: "#f59e0b" },
    { id: "MONTAGEM", label: "Montagem / Acabamento", color: "#3b82f6" },
    { id: "FINALIZADA", label: "Finalizado", color: "#10b981" }
  ];

  const renderCard = (op: OrdemProducao, col: any) => {
    const checklist = op.checklist || [];
    const completed = checklist.filter(i => i.completed).length;
    const total = checklist.length;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    return (
      <div key={op.id} className="card-hover" style={{ 
        background: 'rgba(255,255,255,0.03)', 
        borderRadius: '16px', 
        padding: '1rem', 
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        cursor: 'pointer'
      }} onClick={() => setEditingOP(op)}>
        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700' }}>#{op.op_id}</span>
          <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: `${col.color}22`, color: col.color, borderRadius: '4px', fontWeight: 'bold' }}>
            {op.pecas} PEÇAS
          </span>
        </div>
        
        <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem' }}>{op.produto}</h4>
        
        <div style={{ margin: '0.5rem 0', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-muted)' }}>📅 Previsão:</span>
            <span style={{ fontWeight: 'bold', color: op.data_prevista_entrega && new Date(op.data_prevista_entrega).getTime() < Date.now() ? '#ef4444' : 'inherit' }}>
              {op.data_prevista_entrega ? new Date(op.data_prevista_entrega).toLocaleDateString('pt-BR') : '--'}
            </span>
          </div>
          
          {total > 0 && (
            <div style={{ marginTop: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>CHECKLIST</span>
                <span>{completed}/{total}</span>
              </div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#10b981' : col.color, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {col.id !== "PENDENTE" && (
              <button onClick={() => updateStatus(op, 'voltar')} className="btn-icon" style={{ padding: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <ArrowLeft size={12} />
              </button>
            )}
          </div>
          {col.id !== "FINALIZADA" && (
            <button 
              onClick={() => updateStatus(op, 'avancar')}
              style={{ 
                background: progress === 100 || total === 0 ? 'linear-gradient(135deg, #d4af37, #b49050)' : 'rgba(255,255,255,0.05)', 
                color: progress === 100 || total === 0 ? '#1a1a2e' : 'var(--text-muted)', 
                border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer' 
              }}
            >
              AVANÇAR →
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading && ops.length === 0) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Sincronizando com chão de fábrica...</div>;

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
      gap: '1.5rem',
      alignItems: 'start',
      paddingBottom: '4rem'
    }}>
      {colunas.map(col => (
        <div key={col.id} className="glass" style={{ borderRadius: '20px', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', minHeight: '75vh' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '0.8rem', fontWeight: '800', color: col.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</h2>
            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold' }}>
              {ops.filter(o => o.status === col.id).length}
            </span>
          </header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ops.filter(o => o.status === col.id).map(op => renderCard(op, col))}
          </div>
        </div>
      ))}

      {/* Modal de Edição Industrial */}
      {editingOP && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(10px)' }} onClick={() => setEditingOP(null)}>
          <div className="glass" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '720px', borderRadius: '20px', padding: '1.25rem', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#d4af37' }}>DETALHES DA ORDEM #{editingOP.op_id}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => deleteOP(editingOP.op_id)} disabled={deleting} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer' }}>
                  <Trash2 size={14} />&nbsp;EXCLUIR
                </button>
                <button onClick={() => setEditingOP(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '800', display: 'block', marginBottom: '0.5rem' }}>PRODUTO / AMBIENTE</label>
                  <input 
                    value={editingOP.produto} 
                    onChange={e => setEditingOP({...editingOP, produto: e.target.value})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.95rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '800', display: 'block', marginBottom: '0.5rem' }}>CHECKLIST DE QUALIDADE (MANDATÓRIO)</label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div />
                    <button onClick={() => setEditingOP({...editingOP, checklist: [...(editingOP.checklist || []), { id: Math.random().toString(36).substr(2, 9), task: '', completed: false }]})} 
                      style={{ background: '#d4af37', border: 'none', color: '#1a1a2e', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Plus size={12} /> TAREFA
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto', paddingRight: '8px', marginBottom: '0.5rem' }}>
                    {(editingOP.checklist || []).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', border: '1px dashed var(--border)', borderRadius: '10px' }}>Nenhuma tarefa de conferência definida.</div>
                    )}
                    {(editingOP.checklist || []).map((item, idx) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '10px' }}>
                        <input 
                          type="checkbox" 
                          checked={item.completed} 
                          onChange={e => {
                            const newCheck = [...(editingOP.checklist || [])];
                            newCheck[idx].completed = e.target.checked;
                            setEditingOP({...editingOP, checklist: newCheck});
                          }}
                        />
                        <input 
                          value={item.task}
                          onChange={e => {
                            const newCheck = [...(editingOP.checklist || [])];
                            newCheck[idx].task = e.target.value;
                            setEditingOP({...editingOP, checklist: newCheck});
                          }}
                          placeholder="Descrição da tarefa"
                          style={{ flex: 1, background: 'none', border: 'none', color: item.completed ? 'var(--text-muted)' : 'var(--text)', fontSize: '0.85rem' }}
                        />
                        <button onClick={() => {
                          const newCheck = (editingOP.checklist || []).filter((_, i) => i !== idx);
                          setEditingOP({...editingOP, checklist: newCheck});
                        }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '800', display: 'block', marginBottom: '0.75rem' }}>📦 ENGENHARIA E MATERIAIS</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                      <div>
                        <h5 style={{ fontSize: '0.75rem', color: '#d4af37', marginBottom: '0.5rem', fontWeight: '700' }}>MATERIAIS</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto', paddingRight: '8px' }}>
                          {(editingOP as any).metadata?.materiais?.map((m: any, i: number) => (
                            <div key={i} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                              <span>{m.descricao}</span>
                              <span style={{ fontWeight: '800' }}>{m.quantidade}{m.unidade || ''}</span>
                            </div>
                          )) || <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sem dados de materiais</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <aside style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h5 style={{ fontSize: '0.75rem', color: '#d4af37', marginBottom: '0.25rem', fontWeight: '700' }}>LISTA DE CORTE</h5>
                <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {((editingOP as any).metadata?.pecas || []).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sem lista de peças</div>}
                  {((editingOP as any).metadata?.pecas || []).map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={!!p.operator_checked} onChange={(e) => {
                          const newMeta = { ...(editingOP as any).metadata };
                          const newPecas = Array.isArray(newMeta.pecas) ? [...newMeta.pecas] : [];
                          newPecas[i] = { ...newPecas[i], operator_checked: e.target.checked };
                          newMeta.pecas = newPecas;
                          setEditingOP({ ...editingOP, metadata: newMeta } as any);
                        }} />
                        <div style={{ fontSize: '0.9rem' }}>{p.nome}</div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.largura}x{p.altura}</div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => setEditingOP(null)} style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid var(--border)', fontWeight: '700', cursor: 'pointer' }}>CANCELAR</button>
              <button onClick={() => saveOPDetails(editingOP)} style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e', border: 'none', fontWeight: '800', cursor: 'pointer' }}>SALVAR OP</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionPanel;
