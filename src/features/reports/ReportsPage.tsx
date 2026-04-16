import React, { useState, useEffect } from 'react';
import { FileText, Download, BarChart3, TrendingUp, AlertCircle, ShoppingCart, Calendar } from 'lucide-react';
import { reportService } from '../../services/reportService';
import { useAppContext } from '../../context/AppContext';

const ReportsPage: React.FC = () => {
  const { projects } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);

  const loadReportData = async (type: string, params: any = {}) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ type, ...params }).toString();
      const res = await fetch(`/api/reports?${query}`);
      const data = await res.json();
      setReportData(data);
      setActiveReport(type);
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!activeReport) return;
    
    setLoading(true);
    try {
      if (activeReport === 'fin-rentabilidade') {
        await reportService.generateMapaCustos(reportData);
      } else if (activeReport === 'ind-romaneio') {
         // Exemplo com o primeiro projeto selecionado ou um seletor
         const prj = projects[0];
         await reportService.generateRomaneioProducao(prj?.ambiente || 'Projeto', reportData);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '0.5rem' }}>
           CENTRAL DE RELATÓRIOS
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Inteligência industrial e financeira em documentos acionáveis.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        
        {/* Menu de Tipos */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <ReportMenuItem 
            icon={<TrendingUp size={18} />} 
            label="Rentabilidade de Projetos" 
            active={activeReport === 'fin-rentabilidade'}
            onClick={() => loadReportData('fin-rentabilidade')}
          />
          <ReportMenuItem 
            icon={<FileText size={18} />} 
            label="Romaneios (Oficina)" 
            active={activeReport === 'ind-romaneio'}
            onClick={() => loadReportData('ind-romaneio', { projectId: projects[0]?.id })}
          />
          <ReportMenuItem 
            icon={<ShoppingCart size={18} />} 
            label="Necessidade de Compras" 
            active={activeReport === 'com-necessidade'}
            onClick={() => loadReportData('com-necessidade')}
          />
          <ReportMenuItem 
            icon={<AlertCircle size={18} />} 
            label="Auditoria de Desvios" 
            active={activeReport === 'ind-desvios'}
            onClick={() => loadReportData('ind-desvios')}
          />
        </aside>

        {/* Visualização de Dados */}
        <main className="card" style={{ padding: '2rem', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
          {!activeReport ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
               <div>
                  <BarChart3 size={64} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                  <p>Selecione um relatório ao lado para visualizar os dados e exportar.</p>
               </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                 <h2 style={{ fontSize: '1.2rem', fontWeight: '600' }}>{activeReport.toUpperCase()}</h2>
                 <button 
                  onClick={handleExportPdf}
                  className="btn-primary" 
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem' }}
                 >
                   <Download size={18} /> EXPORTAR PDF
                 </button>
              </div>

              {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>Processando dados...</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        {Object.keys(reportData[0] || {}).map(k => (
                          <th key={k} style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>{k.replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((v: any, j) => (
                            <td key={j} style={{ fontSize: '0.85rem' }}>{v?.toString()}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

const ReportMenuItem: React.FC<{ icon: any, label: string, onClick: () => void, active: boolean }> = ({ icon, label, onClick, active }) => (
  <button 
    onClick={onClick}
    style={{
      all: 'unset',
      padding: '1rem 1.25rem',
      borderRadius: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      background: active ? 'var(--primary-low)' : 'rgba(255,255,255,0.03)',
      border: active ? '1px solid var(--primary)' : '1px solid transparent',
      color: active ? 'var(--primary)' : 'var(--text)'
    }}
  >
    {icon}
    <span style={{ fontSize: '0.9rem', fontWeight: active ? '700' : '500' }}>{label}</span>
  </button>
);

export default ReportsPage;
