import React, { useState, useMemo } from 'react';
import { useEscClose } from '../../hooks/useEscClose';
import { useAppContext } from '../../context/AppContext';
import OrcamentoForm from './OrcamentoForm';
import { generateOrcamentoPDF } from '../../utils/generateOrcamentoPDF';

const OrcamentosPage: React.FC = () => {
  const { orcamentos, projects, clients, condicoesPagamento, removeOrcamento } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  useEscClose(() => { if (showModal) setShowModal(false); });

  const filteredOrcamentos = useMemo(() => {
    return orcamentos.filter(o => {
      const matchSearch = (o.numero + (o.cliente_nome || '')).toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'todos' || o.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [orcamentos, searchTerm, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return '#10b981';
      case 'enviado': return '#3b82f6';
      case 'recusado': return '#ef4444';
      default: return 'var(--text-muted)';
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Gerenciamento de Orçamentos</h2>
          <p style={{ color: 'var(--text-muted)' }}>Crie e acompanhe propostas comerciais com cálculo de juros.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelectedId(undefined); setShowModal(true); }} style={{ padding: '0.75rem 1.5rem', fontWeight: 'bold' }}>
          NOVO ORÇAMENTO
        </button>
      </header>

      <div className="card glass" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Buscar por número ou cliente..." 
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px', padding: '0.75rem 0.75rem 0.75rem 2.5rem', color: 'white', width: '100%', outline: 'none'
            }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px', padding: '0.75rem', color: 'white', outline: 'none'
          }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="todos" style={{background: '#1a1a2e'}}>Todos os Status</option>
          <option value="rascunho" style={{background: '#1a1a2e'}}>Rascunho</option>
          <option value="enviado" style={{background: '#1a1a2e'}}>Enviado</option>
          <option value="aprovado" style={{background: '#1a1a2e'}}>Aprovado</option>
          <option value="recusado" style={{background: '#1a1a2e'}}>Recusado</option>
        </select>
      </div>

      <div className="card glass" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem' }}>Número</th>
              <th style={{ padding: '1rem' }}>Cliente</th>
              <th style={{ padding: '1rem' }}>Projeto</th>
              <th style={{ padding: '1rem' }}>Valor Final</th>
              <th style={{ padding: '1rem' }}>Entrega</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrcamentos.map(o => {
              const proj = projects.find(p => p.id === o.projeto_id);
              const cli = clients?.find(c => c.id?.toString() === o.cliente_id?.toString());
              const cond = condicoesPagamento?.find(c => c.id === o.condicao_pagamento_id);

              return (
              <tr key={o.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="hover-row">
                <td style={{ padding: '1rem', fontWeight: 'bold', color: '#d4af37' }}>{o.numero}</td>
                <td style={{ padding: '1rem' }}>{o.cliente_nome || 'Cliente não encontrado'}</td>
                <td style={{ padding: '1rem', color: proj ? 'var(--text)' : 'var(--text-muted)' }}>
                  {proj ? proj.ambiente : '-'}
                </td>
                <td style={{ padding: '1rem', fontWeight: '600' }}>{formatCurrency(o.valor_final)}</td>
                <td style={{ padding: '1rem' }}>{o.prazo_entrega_dias} dias ({o.prazo_tipo})</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', 
                    background: `${getStatusColor(o.status)}20`, color: getStatusColor(o.status), 
                    border: `1px solid ${getStatusColor(o.status)}40`, fontWeight: '600', textTransform: 'uppercase'
                  }}>
                    {o.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button 
                    onClick={() => generateOrcamentoPDF(o, cli, proj, cond)}
                    title="Baixar PDF"
                    style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', marginRight: '1rem', fontSize: '1.2rem' }}
                  >
                    📄
                  </button>
                  <button onClick={() => { setSelectedId(o.id); setShowModal(true); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginRight: '1rem', fontSize: '1rem' }} title="Editar">✎</button>
                  <button onClick={() => { if(confirm('Excluir este orçamento?')) removeOrcamento(o.id); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem' }} title="Excluir">×</button>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
        {filteredOrcamentos.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Nenhum orçamento encontrado.</p>
            <p style={{ fontSize: '0.9rem' }}>Ajuste os filtros ou crie um novo orçamento.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '2rem' }}>
          <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '1000px', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedId ? 'Editar Orçamento' : 'Novo Orçamento Profissional'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <OrcamentoForm orcamentoId={selectedId} onClose={() => setShowModal(false)} />
          </div>
        </div>
      )}

      <style>{`
        .hover-row:hover { background: rgba(255,255,255,0.02); }
      `}</style>
    </div>
  );
};

export default OrcamentosPage;
