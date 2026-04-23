import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Modal from '../components/ui/Modal';
import { 
  FiPlus, 
  FiFilter, 
  FiCheckCircle, 
  FiTrash2, 
  FiArrowDownLeft, 
  FiCalendar,
  FiMoreVertical,
  FiChevronDown,
  FiChevronRight,
  FiEdit2, FiPrinter, FiRefreshCw, FiFileText
} from 'react-icons/fi';
import ReciboModal from '../components/ReciboModal';

export default function FinanceiroTitulosReceberPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [clientsMap, setClientsMap] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [baixaModal, setBaixaModal] = useState<any>(null);
  const [reciboModal, setReciboModal] = useState<any>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [editModal, setEditModal] = useState<any>(null);

  const [stats, setStats] = useState({
    totalAberto: 0,
    totalVencido: 0,
    totalRecebido: 0
  });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.financeiro.titulosReceber.list({ page: p, perPage });
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
      let recebido = 0;
      const hoje = new Date();

      dataRows.forEach(r => {
        const valor = Number(r.valor_aberto) || 0;
        if (r.status === 'pago') {
          recebido += Number(r.valor_original);
        } else {
          aberto += valor;
          if (new Date(r.data_vencimento) < hoje) {
            vencido += valor;
          }
        }
      });
      setStats({ totalAberto: aberto, totalVencido: vencido, totalRecebido: recebido });

      const clients = await api.clients.list();
      const map: Record<string,string> = {};
      (clients || []).forEach((c: any) => { map[c.id] = c.nome || c.name || `${c.id}`; });
      setClientsMap(map);
      
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
      
      await api.financeiro.titulosReceber.baixar(baixaModal.id, {
        valor_baixa: baixaModal.valor_aberto,
        conta_interna_id: contaId,
        data_baixa: new Date()
      });
      setBaixaModal(null);
      load(page);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar baixa');
    }
  };

  const doDelete = async (id: string) => {
    if (!confirm('Confirma exclusão do título?')) return;
    try {
      await api.financeiro.titulosReceber.delete(id);
      load(page);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  const saveEdit = async () => {
    try {
      await api.financeiro.titulosReceber.update(editModal.id, {
        numero_titulo: editModal.numero_titulo,
        valor_original: editModal.valor_original,
        data_vencimento: editModal.data_vencimento,
        taxa_financeira: editModal.taxa_financeira,
        valor_custo_financeiro: editModal.valor_custo_financeiro,
        status: editModal.status
      });
      setEditModal(null);
      load(page);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações');
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
            <FiArrowDownLeft style={{ color: 'var(--success)' }} />
            Títulos a Receber
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Gestão de recebimentos e fluxo de entrada</p>
        </div>
        <div>
          <button 
            className="btn btn-primary"
            style={{ height: '48px', padding: '0 1.5rem', borderRadius: 'var(--radius-md)' }}
            onClick={() => window.location.hash = '#/financeiro/titulos-receber/wizard'}
          >
            <FiPlus /> NOVO RECEBIMENTO
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
        {[
          { label: 'Total a Receber', value: stats.totalAberto, color: 'var(--info)', icon: FiArrowDownLeft },
          { label: 'Total Recebido', value: stats.totalRecebido, color: 'var(--success)', icon: FiCheckCircle },
          { label: 'Em Atraso', value: stats.totalVencido, color: 'var(--danger)', icon: FiCalendar },
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
                <th>Cliente</th>
                <th style={{ textAlign: 'right' }}>Valor Original</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                Object.entries(
                  rows.reduce((acc: any, r) => {
                    const cid = r.cliente_id || 'unknown';
                    if (!acc[cid]) acc[cid] = [];
                    acc[cid].push(r);
                    return acc;
                  }, {})
                ).map(([cid, groupRows]: [string, any]) => {
                  const isExpanded = expandedGroups[cid];
                  const clientName = clientsMap[cid] || 'NÃO IDENTIFICADO';
                  const totalGroup = groupRows.reduce((sum: number, r: any) => sum + Number(r.valor_original), 0);
                  
                  return (
                    <React.Fragment key={cid}>
                      {/* Group Header Row */}
                      <tr 
                        onClick={() => setExpandedGroups(prev => ({ ...prev, [cid]: !prev[cid] }))}
                        style={{ background: 'rgba(255,255,255,0.03)', cursor: 'pointer', borderLeft: '4px solid var(--primary)' }}
                      >
                        <td colSpan={2} style={{ fontWeight: 800, color: 'var(--text)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                              {clientName.charAt(0).toUpperCase()}
                            </div>
                            {clientName}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.5rem' }}>
                              ({groupRows.length} títulos)
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                          R$ {totalGroup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan={3}>
                           <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '1rem' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                              title="Excluir árvore de títulos"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if(confirm(`DESEJA REALMENTE EXCLUIR TODOS OS ${groupRows.length} TÍTULOS PENDENTES DESTE CLIENTE?`)) {
                                  api.financeiro.titulosReceber.deleteBatch(cid).then(() => {
                                    load(page);
                                  });
                                }
                              }}
                            >
                              <FiTrash2 /> EXCLUIR TUDO
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Detail Rows */}
                      {isExpanded && groupRows.map((r: any) => (
                        <tr key={r.id} style={{ background: 'transparent' }}>
                          <td style={{ paddingLeft: '3rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{r.numero_titulo}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Individual</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                            R$ {Number(r.valor_original).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                              <FiCalendar style={{ opacity: 0.5 }} />
                              {new Date(r.data_vencimento).toLocaleDateString()}
                            </div>
                          </td>
                          <td>
                            <span className="badge" style={getStatusStyle(r.status, r.data_vencimento)}>
                              {r.status === 'pago' ? 'LIQUIDADO' : (new Date(r.data_vencimento) < new Date() ? 'ATRASADO' : 'ABERTO')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px' }}
                                title="Editar"
                                onClick={(e) => { e.stopPropagation(); setEditModal(r); }}
                              >
                                <FiEdit2 />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px' }}
                                title="Baixar Título"
                                disabled={r.status === 'pago'}
                                onClick={(e) => { e.stopPropagation(); setBaixaModal(r); }}
                              >
                                <FiCheckCircle />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px', color: 'var(--danger)' }}
                                title="Excluir"
                                onClick={(e) => { e.stopPropagation(); doDelete(r.id); }}
                              >
                                <FiTrash2 />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px', color: 'var(--primary)' }}
                                title="Ver Recibo"
                                onClick={(e) => { e.stopPropagation(); setReciboModal(r); }}
                              >
                                <FiPrinter />
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

        {/* Footer with items count */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--table-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <div>Mostrando {rows.length} de {total} lançamentos</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem' }} disabled={page === 1} onClick={() => setPage(page-1)}>Anterior</button>
             <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem' }} disabled={page * perPage >= total} onClick={() => setPage(page+1)}>Próxima</button>
          </div>
        </div>
      </div>

      {/* Modal Baixa */}
      <Modal isOpen={!!baixaModal} onClose={() => setBaixaModal(null)} title="Registrar Recebimento">
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
                <div style={{ background: 'var(--surface-hover)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
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
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)' }}>R$ {valorTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="label-base">Conta Bancária / Destino</label>
                  <select id="conta-interna-id" className="input-base">
                    <option value="">Selecione uma conta...</option>
                    {contas.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} (Saldo: R$ {Number(c.saldo_atual).toFixed(2)})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => setBaixaModal(null)}>CANCELAR</button>
                  <button className="btn btn-primary" onClick={async () => {
                    try {
                      const contaId = (document.getElementById('conta-interna-id') as HTMLSelectElement).value;
                      if (!contaId) throw new Error('Selecione uma conta');
                      
                      await api.financeiro.titulosReceber.baixar(baixaModal.id, {
                        valor_baixa: valorTotal,
                        valor_original_baixa: valorAberto,
                        valor_multa: valorMulta,
                        valor_juros: valorJuros,
                        conta_interna_id: contaId,
                        data_baixa: new Date()
                      });
                      setBaixaModal(null);
                      load(page);
                    } catch (err: any) {
                      alert(err.message || 'Erro ao registrar baixa');
                    }
                  }}>CONFIRMAR RECEBIMENTO</button>
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
                <option value="pago">LIQUIDADO</option>
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
            <button className="btn btn-primary" onClick={saveEdit}>SALVAR ALTERAÇÕES</button>
          </div>
        </div>
      </Modal>

      <ReciboModal 
        isOpen={!!reciboModal} 
        onClose={() => setReciboModal(null)} 
        titulo={reciboModal} 
        tipo="receber" 
        beneficiarioOuPagador={reciboModal ? clientsMap[reciboModal.cliente_id] || 'Cliente' : ''} 
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
