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
  FiMoreVertical
} from 'react-icons/fi';

export default function FinanceiroTitulosReceberPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [clientsMap, setClientsMap] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [baixaModal, setBaixaModal] = useState<any>(null);
  const [contas, setContas] = useState<any[]>([]);

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
                rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{r.numero_titulo}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--icon-bg)', color: 'var(--icon-color)', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                          {(clientsMap[r.cliente_id] || 'C').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{clientsMap[r.cliente_id] || 'Não identificado'}</span>
                      </div>
                    </td>
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
                          title="Baixar Título"
                          disabled={r.status === 'pago'}
                          onClick={() => setBaixaModal(r)}
                        >
                          <FiCheckCircle />
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.5rem', width: '36px', height: '36px', color: 'var(--danger)' }}
                          title="Excluir"
                          onClick={() => doDelete(r.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
          <div style={{ background: 'var(--surface-hover)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
             <div className="label-base">Valor a Baixar</div>
             <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>R$ {Number(baixaModal?.valor_aberto).toFixed(2)}</div>
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
            <button className="btn btn-primary" onClick={confirmarBaixa}>CONFIRMAR BAIXA</button>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
