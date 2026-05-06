import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Modal } from '../design-system/components/Modal';
import { Plus, Filter, CheckCircle, Trash2, ArrowUpRight, Calendar, Truck, ChevronDown, ChevronRight, Edit2, Printer, RefreshCw, FileText, Square, CheckSquare, Layers } from 'lucide-react';
import ReciboModal from '../components/ReciboModal';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { TableSkeleton } from '../design-system/components/Skeleton';

export default function FinanceiroTitulosPagarPage() {
  const { success, error, warning } = useToast();
  const [ConfirmDialogElement, confirmAction] = useConfirm();
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [suppliersMap, setSuppliersMap] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [baixaModal, setBaixaModal] = useState<any>(null);
  const [reciboModal, setReciboModal] = useState<any>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loteModal, setLoteModal] = useState(false);
  const [loteData, setLoteData] = useState({ conta_interna_id: '', data_baixa: new Date().toISOString().split('T')[0], observacoes: '' });
  const [loteLoading, setLoteLoading] = useState(false);
  const [editModal, setEditModal] = useState<any>(null);

  const [stats, setStats] = useState({
    totalAberto: 0,
    totalVencido: 0,
    totalPago: 0
  });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.financeiro.titulosPagar.list({ page: p, perPage });
      let dataRows: any[] = [];
      
      if (Array.isArray(res)) {
        dataRows = res;
        setTotal(res.length);
      } else if (res && res.rows) {
        dataRows = res.rows;
        setTotal(res.total || 0);
      } else {
        dataRows = [];
        setTotal(0);
      }
      
      setRows(dataRows);

      let aberto = 0;
      let vencido = 0;
      let pago = 0;
      const hoje = new Date();

      dataRows.forEach(r => {
        const valor = Number(r.valor_aberto) || 0;
        if (r.status === 'pago') {
          pago += Number(r.valor_original);
        } else {
          aberto += valor;
          if (new Date(r.data_vencimento) < hoje) {
            vencido += valor;
          }
        }
      });
      setStats({ totalAberto: aberto, totalVencido: vencido, totalPago: pago });

      const suppliers = await api.suppliers.list();
      const map: Record<string,string> = {};
      (suppliers || []).forEach((s: any) => { map[s.id] = s.nome || s.name || `${s.id}`; });
      setSuppliersMap(map);
      
      const cts = await api.financeiro.contasInternas.list();
      setContas(cts || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const confirmarBaixa = async () => {
    try {
      const contaId = (document.getElementById('conta-interna-id') as HTMLSelectElement).value;
      if (!contaId) throw new Error('Selecione uma conta');
      
      await api.financeiro.titulosPagar.baixar(baixaModal.id, {
        valor_baixa: baixaModal.valor_aberto,
        conta_interna_id: contaId,
        data_baixa: new Date()
      });
      setBaixaModal(null);
      load(page);
      success('Pagamento registrado com sucesso!');
    } catch (err: any) {
      error(err.message || 'Erro ao registrar pagamento');
    }
  };

  const doDelete = async (id: string) => {
    const isConfirmed = await confirmAction({
      title: 'Excluir Título',
      description: 'Confirma exclusão do título?'
    });
    if (!isConfirmed) return;
    try {
      await api.financeiro.titulosPagar.delete(id);
      load(page);
    } catch (err: any) {
      error(err.message || 'Erro ao excluir');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllAbertos = () => {
    const ids = rows.filter(r => r.status === 'aberto').map((r: any) => r.id);
    setSelectedIds(new Set(ids));
  };

  const handleBaixaLote = async () => {
    if (!loteData.conta_interna_id) { warning('Selecione a conta de pagamento'); return; }
    if (selectedIds.size === 0) { warning('Nenhum título selecionado'); return; }
    setLoteLoading(true);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try {
        await api.financeiro.titulosPagar.baixar(id, {
          conta_interna_id: loteData.conta_interna_id,
          data_baixa: loteData.data_baixa,
          observacoes: loteData.observacoes || 'Baixa em lote',
        });
        ok++;
      } catch { fail++; }
    }
    setLoteLoading(false);
    setLoteModal(false);
    setSelectedIds(new Set());
    success(`${ok} títulos pagos com sucesso.${fail > 0 ? ` ${fail} falharam.` : ''}`);
    load(page);
  };


  const saveEdit = async () => {
    try {
      await api.financeiro.titulosPagar.update(editModal.id, {
        numero_titulo: editModal.numero_titulo,
        valor_original: editModal.valor_original,
        data_vencimento: editModal.data_vencimento,
        taxa_financeira: editModal.taxa_financeira,
        valor_custo_financeiro: editModal.valor_custo_financeiro,
        status: editModal.status
      });
      setEditModal(null);
      load(page);
      success('Alterações salvas com sucesso');
    } catch (err: any) {
      error(err.message || 'Erro ao salvar alterações');
    }
  };

  const getStatusStyle = (status: string, vencimento: string) => {
    if (status === 'pago') return { background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' };
    if (new Date(vencimento) < new Date()) return { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' };
    return { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ArrowUpRight />
            Títulos a Pagar
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Gestão de obrigações e fluxo de saída</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {selectedIds.size > 0 && (
            <button 
              className="btn btn-primary"
              style={{ background: '#f59e0b', fontSize: '0.85rem' }}
              onClick={() => setLoteModal(true)}
            >
              <Layers /> PAGAR {selectedIds.size} EM LOTE
            </button>
          )}
          <button 
            className="btn btn-outline"
            style={{ fontSize: '0.8rem' }}
            onClick={selectAllAbertos}
          >
            <CheckSquare /> SELECIONAR ABERTOS
          </button>
          {selectedIds.size > 0 && (
            <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => setSelectedIds(new Set())}>
              Limpar Seleção ({selectedIds.size})
            </button>
          )}
          <button 
            className="btn btn-primary"
            style={{ height: '48px', padding: '0 1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--danger)' }}
            onClick={() => window.location.hash = '#/financeiro/titulos-pagar/wizard'}
          >
            <Plus /> NOVO PAGAMENTO
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
        {[
          { label: 'Total a Pagar', value: stats.totalAberto, color: 'var(--danger)', icon: ArrowUpRight },
          { label: 'Total Pago', value: stats.totalPago, color: 'var(--success)', icon: CheckCircle },
          { label: 'Vencido', value: stats.totalVencido, color: 'var(--danger)', icon: Calendar },
        ].map((stat, i) => (
          <div key={i} className="card glass animate-fade-in" style={{ padding: '1.5rem', borderLeft: `4px solid ${stat.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span className="label-base" style={{ margin: 0 }}>{stat.label}</span>
              <stat.icon style={{ color: stat.color, fontSize: '1.25rem' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              R$ {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="card animate-pop-in" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Fornecedor</th>
                <th style={{ textAlign: 'right' }}>Valor Original</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <div className="empty-state" style={{ border: 'none', borderRadius: 0 }}>
                      Nenhum título encontrado.
                    </div>
                  </td>
                </tr>
              ) : (
                Object.entries(
                  rows.reduce((acc: any, r) => {
                    const sid = r.fornecedor_id || 'unknown';
                    if (!acc[sid]) acc[sid] = [];
                    acc[sid].push(r);
                    return acc;
                  }, {})
                ).map(([sid, groupRows]: [string, any]) => {
                  const isExpanded = expandedGroups[sid];
                  const supplierName = suppliersMap[sid] || 'NÃO IDENTIFICADO';
                  const totalGroup = groupRows.reduce((sum: number, r: any) => sum + Number(r.valor_original), 0);
                  
                  return (
                    <React.Fragment key={sid}>
                      {/* Group Header Row */}
                      <tr 
                        onClick={() => setExpandedGroups(prev => ({ ...prev, [sid]: !prev[sid] }))}
                        style={{ background: 'rgba(255,255,255,0.03)', cursor: 'pointer', borderLeft: '4px solid var(--danger)' }}
                      >
                        <td colSpan={2} style={{ fontWeight: 800, color: 'var(--text)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {isExpanded ? <ChevronDown /> : <ChevronRight />}
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                              {supplierName.charAt(0).toUpperCase()}
                            </div>
                            {supplierName}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.5rem' }}>
                              ({groupRows.length} títulos)
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--danger)' }}>
                          R$ {totalGroup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan={3}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '1rem' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                              title="Excluir árvore de títulos"
                              onClick={async (e) => { 
                                e.stopPropagation(); 
                                const isConfirmed = await confirmAction({
                                  title: 'Excluir Todos os Títulos',
                                  description: `DESEJA REALMENTE EXCLUIR TODOS OS ${groupRows.length} TÍTULOS PENDENTES DESTE FORNECEDOR?`
                                });
                                if(isConfirmed) {
                                  api.financeiro.titulosPagar.deleteBatch(sid).then(() => {
                                    load(page);
                                  });
                                }
                              }}
                              aria-label={`Excluir todos os títulos do fornecedor ${supplierName}`}
                            >
                              <Trash2 /> EXCLUIR TUDO
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Detail Rows */}
                      {isExpanded && groupRows.map((r: any) => (
                        <tr key={r.id} style={{ background: 'transparent' }}>
                          <td style={{ paddingLeft: '3rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--danger)' }}>{r.numero_titulo}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Individual</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                            R$ {Number(r.valor_original).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                              <Calendar style={{ opacity: 0.5 }} />
                              {new Date(r.data_vencimento).toLocaleDateString()}
                            </div>
                          </td>
                          <td>
                            <span className="badge" style={getStatusStyle(r.status, r.data_vencimento)}>
                              {r.status === 'pago' ? 'PAGO' : (new Date(r.data_vencimento) < new Date() ? 'ATRASADO' : 'PENDENTE')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px' }}
                                title="Editar"
                                aria-label={`Editar título ${r.numero_titulo}`}
                                onClick={(e) => { e.stopPropagation(); setEditModal(r); }}
                              >
                                <Edit2 />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px' }}
                                title="Pagar Título"
                                aria-label={`Pagar título ${r.numero_titulo}`}
                                disabled={r.status === 'pago'}
                                onClick={(e) => { e.stopPropagation(); setBaixaModal(r); }}
                              >
                                <ArrowUpRight />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px', color: 'var(--danger)' }}
                                title="Excluir"
                                aria-label={`Excluir título ${r.numero_titulo}`}
                                onClick={(e) => { e.stopPropagation(); doDelete(r.id); }}
                              >
                                <Trash2 />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px', color: 'var(--primary)' }}
                                title="Ver Recibo"
                                aria-label={`Ver recibo do título ${r.numero_titulo}`}
                                onClick={(e) => { e.stopPropagation(); setReciboModal(r); }}
                              >
                                <Printer />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--table-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <div>Mostrando {rows.length} de {total} lançamentos</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem' }} disabled={page === 1} onClick={() => setPage(page-1)}>Anterior</button>
             <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem' }} disabled={page * perPage >= total} onClick={() => setPage(page+1)}>Próxima</button>
          </div>
        </div>
      </div>

      {/* Modal Pagamento */}
      <Modal isOpen={!!baixaModal} onClose={() => setBaixaModal(null)} title="Registrar Pagamento">
        <div style={{ minWidth: '400px' }}>
          {(() => {
            const hoje = new Date();
            const venc = new Date(baixaModal?.data_vencimento);
            const atraso = Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24)));
            const valorAberto = Number(baixaModal?.valor_aberto || 0);
            
            // Lógica de Automação (Senior ERP Style)
            const multaPerc = atraso > 0 ? 0.02 : 0; // 2% multa
            const jurosDiarioPerc = 0.00033; // ~1% ao mês
            const valorMulta = valorAberto * multaPerc;
            const valorJuros = valorAberto * jurosDiarioPerc * atraso;
            const valorTotal = valorAberto + valorMulta + valorJuros;

            return (
              <>
                <div style={{ background: 'var(--surface-hover)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', borderLeft: '4px solid var(--danger)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className="label-base" style={{ margin: 0 }}>Valor Original</span>
                    <span style={{ fontWeight: 600 }}>R$ {valorAberto.toFixed(2)}</span>
                  </div>
                  {atraso > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--danger)' }}>
                        <span className="label-base" style={{ margin: 0, color: 'inherit' }}>Multa (2% - {atraso} dias)</span>
                        <span style={{ fontWeight: 600 }}>+ R$ {valorMulta.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--danger)' }}>
                        <span className="label-base" style={{ margin: 0, color: 'inherit' }}>Juros (1%/mês)</span>
                        <span style={{ fontWeight: 600 }}>+ R$ {valorJuros.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>VALOR TOTAL</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--danger)' }}>R$ {valorTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="label-base">Conta Bancária / Débito</label>
                  <select id="conta-interna-id" className="input-base">
                    <option value="">Selecione uma conta...</option>
                    {contas.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} (Saldo: R$ {Number(c.saldo_atual).toFixed(2)})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => setBaixaModal(null)}>CANCELAR</button>
                  <button className="btn btn-primary" style={{ background: 'var(--danger)' }} onClick={async () => {
                    try {
                      const contaId = (document.getElementById('conta-interna-id') as HTMLSelectElement).value;
                      if (!contaId) throw new Error('Selecione uma conta');
                      
                      await api.financeiro.titulosPagar.baixar(baixaModal.id, {
                        valor_baixa: valorTotal,
                        valor_original_baixa: valorAberto,
                        valor_multa: valorMulta,
                        valor_juros: valorJuros,
                        conta_interna_id: contaId,
                        data_baixa: new Date()
                      });
                      setBaixaModal(null);
                      load(page);
                      success('Pagamento registrado com sucesso!');
                    } catch (err: any) {
                      error(err.message || 'Erro ao registrar pagamento');
                    }
                  }}>CONFIRMAR PAGAMENTO</button>
                </div>
              </>
            );
          })()}
        </div>
      </Modal>

      {/* Modal Edição Individual */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Editar Título" width="600px">
        <div style={{ padding: '0.5rem' }}>
          <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="label-base" style={{ wordBreak: 'break-word' }}>Número do Título</label>
              <input 
                type="text" 
                className="input-base" 
                value={editModal?.numero_titulo || ''} 
                onChange={e => setEditModal({...editModal, numero_titulo: e.target.value})}
              />
            </div>
            <div>
              <label className="label-base">Status</label>
              <select 
                className="input-base" 
                value={editModal?.status || ''} 
                onChange={e => setEditModal({...editModal, status: e.target.value})}
              >
                <option value="aberto">ABERTO / PENDENTE</option>
                <option value="pago">PAGO</option>
                <option value="cancelado">CANCELADO</option>
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="label-base" style={{ wordBreak: 'break-word' }}>Valor Original (R$)</label>
              <input 
                type="number" 
                className="input-base" 
                value={editModal?.valor_original || 0} 
                onChange={e => setEditModal({...editModal, valor_original: e.target.value})}
              />
            </div>
            <div>
              <label className="label-base" style={{ wordBreak: 'break-word' }}>Data de Vencimento</label>
              <input 
                type="date" 
                className="input-base" 
                value={editModal?.data_vencimento ? new Date(editModal.data_vencimento).toISOString().split('T')[0] : ''} 
                onChange={e => setEditModal({...editModal, data_vencimento: e.target.value})}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="label-base" style={{ wordBreak: 'break-word' }}>Taxa Finan. (%)</label>
              <input 
                type="number" 
                className="input-base" 
                value={editModal?.taxa_financeira || 0} 
                onChange={e => setEditModal({...editModal, taxa_financeira: e.target.value})}
              />
            </div>
            <div>
              <label className="label-base" style={{ wordBreak: 'break-word' }}>Custo Finan. (R$)</label>
              <input 
                type="number" 
                className="input-base" 
                value={editModal?.valor_custo_financeiro || 0} 
                onChange={e => setEditModal({...editModal, valor_custo_financeiro: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button className="btn btn-outline" onClick={() => setEditModal(null)}>CANCELAR</button>
            <button className="btn btn-primary" style={{ background: 'var(--danger)' }} onClick={saveEdit}>SALVAR ALTERAÇÕES</button>
          </div>
        </div>
      </Modal>

      <ReciboModal 
        isOpen={!!reciboModal} 
        onClose={() => setReciboModal(null)} 
        titulo={reciboModal} 
        tipo="pagar" 
        beneficiarioOuPagador={reciboModal ? suppliersMap[reciboModal.fornecedor_id] || 'Fornecedor' : ''} 
      />

      {/* Modal de Pagamento em Lote */}
      <Modal isOpen={loteModal} onClose={() => setLoteModal(false)} title={`Pagar em Lote (${selectedIds.size} títulos selecionados)`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--warning)' }}>
            ⚠️ Todos os {selectedIds.size} títulos serão baixados pelo valor em aberto atual.
          </div>
          
          <div>
            <label className="label-base">Conta de Pagamento *</label>
            <select className="input-base" value={loteData.conta_interna_id} onChange={e => setLoteData(d => ({ ...d, conta_interna_id: e.target.value }))}>
              <option value="">Selecione a conta...</option>
              {contas.map((c: any) => <option key={c.id} value={c.id}>{c.nome} — R$ {Number(c.saldo_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>)}
            </select>
          </div>

          <div>
            <label className="label-base">Data do Pagamento</label>
            <input type="date" className="input-base" value={loteData.data_baixa} onChange={e => setLoteData(d => ({ ...d, data_baixa: e.target.value }))} />
          </div>

          <div>
            <label className="label-base">Observação</label>
            <input type="text" className="input-base" placeholder="Pagamento em lote..." value={loteData.observacoes} onChange={e => setLoteData(d => ({ ...d, observacoes: e.target.value }))} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-outline" onClick={() => setLoteModal(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ background: '#f59e0b' }} onClick={handleBaixaLote} disabled={loteLoading}>
              {loteLoading ? '⏳ Processando...' : `CONFIRMAR PAGAMENTO DE ${selectedIds.size} TÍTULOS`}
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      {ConfirmDialogElement}
    </div>
  );
}
