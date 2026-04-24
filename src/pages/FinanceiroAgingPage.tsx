import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { FiAlertCircle, FiCalendar, FiUser, FiClock, FiMail, FiPhone } from 'react-icons/fi';

export default function FinanceiroAgingPage() {
  const [data, setData] = useState<{ summary: any[], details: any[] }>({ summary: [], details: [] });
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState<'receber' | 'pagar'>('receber');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.financeiro.relatorios.aging({ modo });
      setData(res?.data || res || { summary: [], details: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [modo]);

  const faixasPrioridade = ['Acima de 90 Dias', '61-90 Dias', '31-60 Dias', '0-30 Dias', 'A Vencer'];
  const summarySorted = [...data.summary].sort((a, b) => 
    faixasPrioridade.indexOf(a.faixa) - faixasPrioridade.indexOf(b.faixa)
  );

  const totalVencido = data.details.reduce((sum, d) => sum + Number(d.valor_aberto), 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FiAlertCircle style={{ color: modo === 'receber' ? 'var(--warning)' : 'var(--danger)' }} />
            Aging / {modo === 'receber' ? 'Inadimplência' : 'Dívidas'}
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
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>Carregando...</td></tr>
              ) : data.details.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Nenhum título vencido encontrado. Parabéns!</td></tr>
              ) : (
                data.details.map((t, i) => {
                  const diasAtraso = Math.floor((new Date().getTime() - new Date(t.data_vencimento).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={t.id || i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                            <FiUser />
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
                          <FiCalendar style={{ opacity: 0.5 }} />
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
                          <button className="btn btn-outline" style={{ padding: '0.4rem' }} title="E-mail Cobrança"><FiMail /></button>
                          <button className="btn btn-outline" style={{ padding: '0.4rem' }} title="WhatsApp"><FiPhone /></button>
                          <button className="btn btn-outline" style={{ padding: '0.4rem' }} title="Histórico"><FiClock /></button>
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
    </div>
  );
}
