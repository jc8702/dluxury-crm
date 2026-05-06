import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AlertCircle, Calendar, User, Clock, Mail, Phone, Filter, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../design-system/components/Skeleton';

export default function FinanceiroAgingPage() {
  const { warning } = useToast();
  const [data, setData] = useState<{ summary: any[], details: any[] }>({ summary: [], details: [] });
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState<'receber' | 'pagar'>('receber');
  const [historico, setHistorico] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.financeiro.relatorios.aging({ modo, historico });
      setData(res?.data || res || { summary: [], details: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [modo, historico]);

  const faixasPrioridade = ['Acima de 90 Dias', '61-90 Dias', '31-60 Dias', '0-30 Dias', 'A Vencer'];
  const summarySorted = [...data.summary].sort((a, b) => 
    faixasPrioridade.indexOf(a.faixa) - faixasPrioridade.indexOf(b.faixa)
  );

  const handleEmail = (item: any) => {
    const email = item.entidade_email || (modo === 'receber' ? item.cliente_email : item.fornecedor_email);
    const nome = item.entidade_nome;
    const valor = Number(item.valor_aberto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dataVenc = new Date(item.data_vencimento).toLocaleDateString('pt-BR');
    
    const subject = encodeURIComponent(`Cobrança - Título ${item.numero_titulo}`);
    const body = encodeURIComponent(`Prezado(a) ${nome},\n\nInformamos que o título ${item.numero_titulo} no valor de ${valor} venceu em ${dataVenc}.\n\nPor favor, entre em contato para regularizar a situação.\n\nAtenciosamente,\nD'LUXURY Ambientes`);
    
    if (email) {
      window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    } else {
      warning('E-mail não encontrado para este cliente/fornecedor');
    }
  };

  const handleWhatsApp = (item: any) => {
    const telefone = item.entidade_telefone || (modo === 'receber' ? item.cliente_telefone : item.fornecedor_telefone);
    const nome = item.entidade_nome;
    const valor = Number(item.valor_aberto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dataVenc = new Date(item.data_vencimento).toLocaleDateString('pt-BR');
    
    const mensagem = encodeURIComponent(`Olá ${nome}, tudo bem? Aqui é da D'LUXURY. Seu título de ${valor} venceu em ${dataVenc}. Podemos conversar sobre a regularização?`);
    
    if (telefone) {
      const cleanPhone = telefone.replace(/\D/g, '');
      window.open(`https://wa.me/55${cleanPhone}?text=${mensagem}`, '_blank');
    } else {
      warning('Telefone não encontrado para este cliente/fornecedor');
    }
  };

  const handleHistory = async (item: any) => {
    setSelectedItem(item);
    setShowHistoryModal(true);
    try {
      const entityId = modo === 'receber' ? item.cliente_id : item.fornecedor_id;
      const res = await api.financeiro.relatorios.aging({ modo, historico: true });
      const allHistory = res?.data?.details || [];
      const filtered = allHistory.filter((h: any) => 
        modo === 'receber' ? h.cliente_id === entityId : h.fornecedor_id === entityId
      );
      setHistoryData(filtered);
    } catch (err) {
      console.error(err);
      setHistoryData([]);
    }
  };

  const totalVencido = data.details.reduce((sum, d) => sum + Number(d.valor_aberto), 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle style={{ color: modo === 'receber' ? 'var(--warning)' : 'var(--danger)' }} />
            Aging / {modo === 'receber' ? (historico ? 'HISTÓRICO RECEBER' : 'Inadimplência') : (historico ? 'HISTÓRICO PAGAR' : 'Dívidas')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Análise de atrasos e gestão de cobrança</p>
        </div>

        <div style={{ display: 'flex', background: 'var(--surface-hover)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <button 
            onClick={() => setModo('receber')}
            style={{ 
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
              background: modo === 'receber' ? 'var(--primary)' : 'transparent',
              color: modo === 'receber' ? 'white' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.2s'
            }}>RECEBER</button>
          <button 
            onClick={() => setModo('pagar')}
            style={{ 
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
              background: modo === 'pagar' ? 'var(--primary)' : 'transparent',
              color: modo === 'pagar' ? 'white' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.2s'
            }}>PAGAR</button>
          <div style={{ width: '1px', background: 'var(--border)', margin: '0 0.5rem' }} />
          <button 
            onClick={() => setHistorico(!historico)}
            style={{ 
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
              background: historico ? 'var(--warning)' : 'transparent',
              color: historico ? 'black' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
            <Filter />{historico ? 'HISTÓRICO' : 'VENCIDOS'}
          </button>
        </div>
      </div>

      {/* Grid de Faixas */}
      <div className="grid-5" style={{ gap: '1rem', marginBottom: '2.5rem' }}>
        {faixasPrioridade.map(faixa => {
          const item = data.summary.find(s => s.faixa === faixa);
          const total = Number(item?.total || 0);
          const isLate = faixa !== 'A Vencer';
          
          return (
            <div key={faixa} className="card glass" style={{ 
              padding: '1.25rem', 
              borderTop: `4px solid ${isLate ? (total > 0 ? 'var(--danger)' : 'var(--border)') : 'var(--success)'}`,
              opacity: total === 0 ? 0.6 : 1
            }}>
              <div className="label-base" style={{ fontSize: '0.65rem' }}>{faixa.toUpperCase()}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.5rem 0' }}>
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {item?.qtd_titulos || 0} título(s)
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista Detalhada */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ background: 'var(--surface-hover)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>DETALHAMENTO DE TÍTULOS VENCIDOS</h3>
          <span className="badge badge-danger">TOTAL VENCIDO: R$ {totalVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>{modo === 'receber' ? 'Cliente' : 'Fornecedor'}</th>
                <th>Título</th>
                <th>Vencimento</th>
                <th>Atraso</th>
                <th style={{ textAlign: 'right' }}>Valor Aberto</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={3} cols={6} />
              ) : data.details.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <div className="empty-state" style={{ border: 'none', borderRadius: 0, color: 'var(--success)' }}>
                      Nenhum título vencido encontrado. Parabéns!
                    </div>
                  </td>
                </tr>
              ) : (
                data.details.map((t, i) => {
                  const diasAtraso = Math.floor((new Date().getTime() - new Date(t.data_vencimento).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={t.id || i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                            <User />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{t.entidade_nome || (modo === 'receber' ? 'Cliente' : 'Fornecedor') + ' não identificado'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {t.cliente_id || t.fornecedor_id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.numero_titulo}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Calendar style={{ opacity: 0.5 }} />
                          {new Date(t.data_vencimento).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                          {diasAtraso} dias
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--danger)' }}>
                        R$ {Number(t.valor_aberto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button className="btn btn-outline" style={{ padding: '0.4rem' }} title="E-mail Cobrança" onClick={() => handleEmail(t)}><Mail /></button>
                          <button className="btn btn-outline" style={{ padding: '0.4rem' }} title="WhatsApp" onClick={() => handleWhatsApp(t)}><Phone /></button>
                          <button className="btn btn-outline" style={{ padding: '0.4rem' }} title="Histórico" onClick={() => handleHistory(t)}><Clock /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); }
        @media (max-width: 1000px) { .grid-5 { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); } }
      `}</style>

      {/* History Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="card" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h3>Histórico de Pagamentos</h3>
              <button onClick={() => setShowHistoryModal(false)} className="btn btn-outline" style={{ padding: '0.5rem' }}><X /></button>
            </div>
            {selectedItem && (
              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: '8px' }}>
                <strong>{selectedItem.entidade_nome}</strong><br/>
                <small style={{ color: 'var(--text-muted)' }}>Título: {selectedItem.numero_titulo}</small>
              </div>
            )}
            {historyData.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum histórico encontrado</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Data Vencimento</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((h: any, i: number) => (
                    <tr key={h.id || i}>
                      <td>{new Date(h.data_vencimento).toLocaleDateString('pt-BR')}</td>
                      <td>R$ {Number(h.valor_aberto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td><span className="badge badge-success">{h.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
