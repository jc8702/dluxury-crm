import React, { useEffect } from 'react';
import { useSimulation } from '../../../context/simulator/SimulationContext';
import type { SimulationRecord } from '../../../infrastructure/repositories/SimulationRepository';

export const ProposalsHistory: React.FC = () => {
  const { pastSimulations, loadingHistory, loadHistory, setInput } = useSimulation();

  useEffect(() => {
    loadHistory();
  }, []);

  const handleLoadSimulation = (proposal: SimulationRecord) => {
    if (proposal.dados_input) {
        setInput(proposal.dados_input);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        alert('Esta simulação antiga não possui dados de entrada para restauração completa.');
    }
  };

  if (loadingHistory && pastSimulations.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Carregando histórico...</div>;
  }

  return (
    <div className="card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Histórico de Simulações (Supabase)</h3>
          <button onClick={() => loadHistory()} className="btn" style={{ fontSize: '0.6rem', padding: '0.4rem 0.8rem' }}>
            {loadingHistory ? 'CARREGANDO...' : 'ATUALIZAR ↻'}
          </button>
       </div>

       <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
             <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                   <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>Data</th>
                   <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>Cliente</th>
                   <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>Faturamento</th>
                   <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>Margem</th>
                   <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Ações</th>
                </tr>
             </thead>
             <tbody>
                {pastSimulations.map((p) => (
                   <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>{new Date(p.created_at || '').toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{p.cliente_nome}</td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--secondary)' }}>
                        {p.dados_simulacao.totalMonthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', color: p.dados_simulacao.averageMargin >= 0.1 ? 'var(--success)' : 'var(--warning)' }}>
                        {(p.dados_simulacao.averageMargin * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                         <button 
                            onClick={() => handleLoadSimulation(p)}
                            style={{ all: 'unset', cursor: 'pointer', color: 'var(--primary)', fontWeight: 700, fontSize: '0.65rem' }}
                         >
                            ABRIR
                         </button>
                      </td>
                   </tr>
                ))}
                {pastSimulations.length === 0 && !loadingHistory && (
                   <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma simulação encontrada.</td>
                   </tr>
                )}
             </tbody>
          </table>
       </div>
    </div>
  );
};
