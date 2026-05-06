import React from 'react';
import DataTable from '../ui/DataTable';
import { Modal } from '../../design-system/components/Modal';
import { useAppContext } from '../../context/AppContext';
import type { Project, ProjectStatus } from '../../context/AppContext';

const Dashboard: React.FC = () => {
  const { projects, clients, billings, totalPeriodo, currentMeta, selectedPeriod, setSelectedPeriod, monthlyGoals, setMonthlyGoal } = useAppContext();
  const [editGoal, setEditGoal] = React.useState(false);
  const [goalValue, setGoalValue] = React.useState('');

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const periods = [
    { id: '2026-01', label: 'Jan/26' }, { id: '2026-02', label: 'Fev/26' },
    { id: '2026-03', label: 'Mar/26' }, { id: '2026-04', label: 'Abr/26' },
    { id: '2026-05', label: 'Mai/26' }, { id: '2026-06', label: 'Jun/26' },
    { id: '2026-07', label: 'Jul/26' }, { id: '2026-08', label: 'Ago/26' },
    { id: '2026-09', label: 'Set/26' }, { id: '2026-10', label: 'Out/26' },
    { id: '2026-11', label: 'Nov/26' }, { id: '2026-12', label: 'Dez/26' },
  ];

  // ─── KPIs ──────────────────────────────────────────────
  const statusLabels: Record<ProjectStatus, string> = {
    lead: '📥 Lead',
    visita_tecnica: '📐 Visita Técnica',
    orcamento_enviado: '📄 Orçamento Enviado',
    aprovado: '✅ Aprovado',
    em_producao: '🔨 Em Produção',
    pronto_entrega: '📦 Pronto p/ Entrega',
    instalado: '🏠 Instalado',
    concluido: '🏁 Concluído',
  };

  const statusCounts = Object.keys(statusLabels).map(status => ({
    status: status as ProjectStatus,
    label: statusLabels[status as ProjectStatus],
    count: projects.filter(p => p.status === status).length,
    value: projects.filter(p => p.status === status).reduce((acc, p) => acc + (p.valorEstimado || 0), 0),
  }));

  const totalPipeline = projects.reduce((acc, p) => acc + (p.valorEstimado || 0), 0);
  const inProduction = projects.filter(p => p.status === 'em_producao').length;
  const concluidos = projects.filter(p => p.status === 'concluido').length;
  const ticketMedio = concluidos > 0
    ? projects.filter(p => p.status === 'concluido').reduce((acc, p) => acc + (p.valorFinal || p.valorEstimado || 0), 0) / concluidos
    : 0;

  // Origem dos leads
  const origemCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(c => {
      const key = c.origem || 'outro';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [clients]);

  const origemLabels: Record<string, { label: string; color: string }> = {
    indicacao: { label: '👥 Indicação', color: '#10b981' },
    instagram: { label: '📸 Instagram', color: '#e1306c' },
    google: { label: '🔍 Google', color: '#4285f4' },
    feira: { label: '🎪 Feira', color: '#f59e0b' },
    passante: { label: '🚶 Passante', color: '#8b5cf6' },
    outro: { label: '📌 Outro', color: '#6b7280' },
  };

  const percentualMeta = currentMeta > 0 ? Math.min(Math.round((totalPeriodo / currentMeta) * 100), 100) : 0;

  // Recent projects
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
    .slice(0, 6);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Painel Geral</h2>
          <p style={{ color: 'var(--text-muted)' }}>Visão executiva — D'Luxury Ambientes</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            className="input"
            style={{ width: '140px', background: 'var(--surface)', borderColor: '#d4af37', fontSize: '0.8rem' }}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </header>

      {/* KPIs principais */}
      <div className="grid-4" style={{ gap: '1rem' }}>
        <div className="card glass" style={{ padding: '1.25rem', borderLeft: '3px solid #d4af37' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Clientes</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#d4af37' }}>{clients.length}</h3>
        </div>
        <div className="card glass" style={{ padding: '1.25rem', borderLeft: '3px solid #3b82f6' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Projetos Ativos</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#3b82f6' }}>
            {projects.filter(p => !['concluido'].includes(p.status)).length}
          </h3>
        </div>
        <div className="card glass" style={{ padding: '1.25rem', borderLeft: '3px solid #f59e0b' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Em Produção</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f59e0b' }}>{inProduction}</h3>
        </div>
        <div className="card glass" style={{ padding: '1.25rem', borderLeft: '3px solid #10b981' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Concluídos</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>{concluidos}</h3>
        </div>
        <div className="card glass" style={{ padding: '1.25rem', borderLeft: '3px solid #8b5cf6' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ticket Médio</p>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#8b5cf6' }}>{formatCurrency(ticketMedio)}</h3>
        </div>
      </div>

      {/* Meta + Pipeline por etapa */}
      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* Meta mensal */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Meta do Período</h3>
          <div style={{
            width: '140px', height: '140px', borderRadius: '50%',
            background: `conic-gradient(#d4af37 ${percentualMeta * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '110px', height: '110px', borderRadius: '50%', background: 'var(--surface)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#d4af37' }}>{percentualMeta}%</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>atingido</span>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {formatCurrency(totalPeriodo)} / {formatCurrency(currentMeta)}
          </p>
          <button onClick={() => { setEditGoal(true); setGoalValue(currentMeta.toString()); }}
            style={{ fontSize: '0.7rem', color: '#d4af37', background: 'none', border: '1px solid rgba(212,175,55,0.3)', padding: '0.3rem 0.8rem', borderRadius: '20px', cursor: 'pointer' }}>
            Editar Meta
          </button>
        </div>

        {/* Pipeline resumo */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Evolução Financeira</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {periods.slice(0, 6).map(p => {
              const monthBillings = billings.filter(b => b.data && b.data.startsWith(p.id));
              const entradas = monthBillings.filter(b => b.tipo !== 'saida').reduce((acc, b) => acc + (Number(b.valor) || 0), 0);
              const saidas = monthBillings.filter(b => b.tipo === 'saida').reduce((acc, b) => acc + (Number(b.valor) || 0), 0);
              
              // Define um teto máximo para a barra (mínimo de 1 para evitar divisão por zero)
              const maxVal = Math.max(entradas, saidas, 1000); 
              const percEntrada = (entradas / maxVal) * 100;
              const percSaida = (saidas / maxVal) * 100;

              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.label}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {/* Barra de Entrada */}
                    <div style={{ display: 'flex', alignItems: 'center', height: '12px' }}>
                       <div style={{ 
                         width: `${Math.min(percEntrada, 100)}%`, height: '100%', 
                         background: '#10b981', borderTopRightRadius: '4px', borderBottomRightRadius: '4px',
                         transition: 'width 0.5s ease'
                       }} />
                       {entradas > 0 && <span style={{ fontSize: '0.6rem', color: '#10b981', marginLeft: '6px' }}>{formatCurrency(entradas)}</span>}
                    </div>
                    {/* Barra de Saída */}
                    <div style={{ display: 'flex', alignItems: 'center', height: '12px' }}>
                       <div style={{ 
                         width: `${Math.min(percSaida, 100)}%`, height: '100%', 
                         background: '#ef4444', borderTopRightRadius: '4px', borderBottomRightRadius: '4px',
                         transition: 'width 0.5s ease'
                       }} />
                       {saidas > 0 && <span style={{ fontSize: '0.6rem', color: '#ef4444', marginLeft: '6px' }}>{formatCurrency(saidas)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Entradas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saídas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Origem de leads + Projetos recentes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Origem dos Leads</h3>
          {origemCounts.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>Nenhum cliente cadastrado.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {origemCounts.map(o => {
                const info = origemLabels[o.key] || origemLabels.outro;
                const pct = clients.length > 0 ? Math.round((o.count / clients.length) * 100) : 0;
                return (
                  <div key={o.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', width: '120px' }}>{info.label}</span>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', background: info.color,
                        borderRadius: '4px', transition: 'width 0.5s ease',
                        minWidth: pct > 0 ? '24px' : '0'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: info.color, width: '40px', textAlign: 'right' }}>{o.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Projetos Recentes</h3>
          {recentProjects.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>Nenhum projeto cadastrado.</div>
          ) : (
            <DataTable
              headers={['Ambiente', 'Cliente', 'Valor', 'Etapa']}
              data={recentProjects}
              renderRow={(p: Project) => (
                <>
                  <td style={{ padding: '0.75rem', fontWeight: '600' }}>{p.ambiente}</td>
                  <td style={{ padding: '0.75rem' }}>{p.clientName || '-'}</td>
                  <td style={{ padding: '0.75rem', fontWeight: '700', color: '#d4af37' }}>
                    {p.valorEstimado ? formatCurrency(p.valorEstimado) : '-'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: '600',
                      padding: '0.2rem 0.6rem', borderRadius: '12px',
                      background: 'rgba(212,175,55,0.1)', color: '#d4af37',
                      border: '1px solid rgba(212,175,55,0.2)'
                    }}>
                      {statusLabels[p.status] || p.status}
                    </span>
                  </td>
                </>
              )}
            />
          )}
        </div>
      </div>

      {/* Modal editar meta */}
      <Modal isOpen={editGoal} onClose={() => setEditGoal(false)} title="Definir Meta Mensal">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Valor da meta para {selectedPeriod}:</label>
          <input type="number" className="input" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
            value={goalValue} onChange={e => setGoalValue(e.target.value)} />
          <button className="btn" onClick={() => { setMonthlyGoal(selectedPeriod, parseFloat(goalValue) || 0); setEditGoal(false); }}
            style={{ background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e', fontWeight: '700', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer' }}>
            Salvar Meta
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;

