import React from 'react';
import Gauge from '../../components/charts/Gauge';
import StackedBarChart from '../../components/charts/StackedBarChart';
import DataTable from '../../components/common/DataTable';
import { useAppContext } from '../../context/AppContext';
import type { Billing } from '../../context/AppContext';

const Dashboard: React.FC = () => {
  const { billings, totalPeriodo, totalPedidosCarteira, yearlyEvolutionData, currentMeta, selectedPeriod, setSelectedPeriod } = useAppContext();
  const [recentPage, setRecentPage] = React.useState(1);
  const recentItemsPerPage = 5;

  const percentualMeta = currentMeta > 0 ? Math.min(Math.round((totalPeriodo / currentMeta) * 100), 100) : 0;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) {
      return dateStr;
    }
  };

  const faturedBillings = billings.filter(b => b.status === 'FATURADO');
  
  const periods = [
    { id: 'Annual', label: 'Visão Anual (2026)' },
    { id: '2026-01', label: 'Janeiro 2026' },
    { id: '2026-02', label: 'Fevereiro 2026' },
    { id: '2026-03', label: 'Março 2026' },
    { id: '2026-04', label: 'Abril 2026' },
    { id: '2026-05', label: 'Maio 2026' },
    { id: '2026-06', label: 'Junho 2026' },
    { id: '2026-07', label: 'Julho 2026' },
    { id: '2026-08', label: 'Agosto 2026' },
    { id: '2026-09', label: 'Setembro 2026' },
    { id: '2026-10', label: 'Outubro 2026' },
    { id: '2026-11', label: 'Novembro 2026' },
    { id: '2026-12', label: 'Dezembro 2026' },
  ];

  const currentPeriodBillings = selectedPeriod === 'Annual' 
    ? faturedBillings.filter(b => b.data.startsWith(new Date().getFullYear().toString()))
    : faturedBillings.filter(b => b.data.startsWith(selectedPeriod));

  // Recent Billings Pagination
  const recentTotalPages = Math.max(1, Math.ceil(billings.length / recentItemsPerPage));
  const paginatedRecent = billings.slice((recentPage - 1) * recentItemsPerPage, recentPage * recentItemsPerPage);

  const headers = ['Nota Fiscal', 'Pedido', 'Cliente', 'Código ERP', 'Valor R$', 'Data'];

  const renderBillingRow = (b: Billing) => (
    <>
      <td style={{ padding: '1rem' }}>{b.nf}</td>
      <td style={{ padding: '1rem' }}>{b.pedido}</td>
      <td style={{ padding: '1rem' }}>{b.cliente}</td>
      <td style={{ padding: '1rem' }}>{b.erp}</td>
      <td style={{ padding: '1rem', fontWeight: 'bold' }}>{formatCurrency(b.valor)}</td>
      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{formatDate(b.data)}</td>
    </>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Painel Geral de Vendas</h2>
          <p style={{ color: 'var(--text-muted)' }}>Métricas extraídas em tempo real do banco de dados.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>Filtrar Período:</label>
          <select 
            className="input" 
            style={{ width: '200px', background: 'var(--surface)', borderColor: 'var(--primary)' }}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>Meta do Período ({selectedPeriod === 'Annual' ? 'Ano' : 'Real'})</h3>
          <Gauge value={percentualMeta} label="Atingido" sublabel={`Objetivo: ${formatCurrency(currentMeta)}`} />
          <p style={{ fontSize: '0.875rem', marginTop: '1rem', color: 'var(--text-muted)' }}>
            Faturamento: <b>{formatCurrency(totalPeriodo)}</b>
          </p>
        </div>

        <div className="card">
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem' }}>Faturamentos Recentes</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} disabled={recentPage === 1} onClick={() => setRecentPage(p => p - 1)}>←</button>
                 <span style={{ fontSize: '0.75rem', alignSelf: 'center' }}>{recentPage} / {recentTotalPages}</span>
                 <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} disabled={recentPage === recentTotalPages} onClick={() => setRecentPage(p => p + 1)}>→</button>
              </div>
           </div>
           <DataTable 
             headers={headers} 
             data={paginatedRecent} 
             renderRow={renderBillingRow} 
           />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <div className="card glass">
           <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ticket Médio ({selectedPeriod === 'Annual' ? 'Ano' : 'Mês'})</p>
           <h4 style={{ fontSize: '1.25rem' }}>{currentPeriodBillings.length > 0 ? formatCurrency(totalPeriodo / currentPeriodBillings.length) : 'R$ 0,00'}</h4>
        </div>
        <div className="card glass">
           <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantidade de NFs</p>
           <h4 style={{ fontSize: '1.25rem' }}>{currentPeriodBillings.length}</h4>
        </div>
        <div className="card glass" style={{ borderLeft: '4px solid var(--warning)' }}>
           <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pedidos em Carteira</p>
           <h4 style={{ fontSize: '1.25rem', color: 'var(--warning)' }}>{formatCurrency(totalPedidosCarteira)}</h4>
        </div>
         <div className="card glass">
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Database Status</p>
            <h4 style={{ fontSize: '1.25rem', color: 'var(--success)' }}>Online</h4>
         </div>
      </div>

      <div>
         <StackedBarChart 
            data={yearlyEvolutionData} 
            title="Evolução Mensal (Meta vs Faturado vs Carteira)" 
         />
      </div>
    </div>
  );
};

export default Dashboard;
