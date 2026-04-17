import React, { useState, useEffect } from 'react';
import { FileText, Download, BarChart3, TrendingUp, AlertCircle, ShoppingCart, Calendar, Search, Loader2 } from 'lucide-react';
import { reportService } from '../../services/reportService';
import { apiService } from '../../services/apiService';
import { useAppContext } from '../../context/AppContext';

const ReportsPage: React.FC = () => {
  const { projects } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  const loadReportData = async (type: string, params: any = {}) => {
    setLoading(true);
    try {
      const data = await apiService.getReports(type, params.projectId);
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
         const prj = projects.find(p => p.id === selectedProjectId);
         await reportService.generateRomaneioProducao(prj?.ambiente || 'Projeto', reportData);
      } else {
        alert('Exportação para este relatório está sendo preparada.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--text)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
           <BarChart3 size={40} style={{ color: 'var(--primary)' }} /> CENTRAL DE RELATÓRIOS
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Inteligência industrial e financeira em documentos acionáveis.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 300px) 1fr', gap: '2rem' }}>
        
        {/* Menu de Tipos */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <ReportMenuItem 
            icon={<TrendingUp size={18} />} 
            label="Rentabilidade de Projetos" 
            active={activeReport === 'fin-rentabilidade'}
            onClick={() => loadReportData('fin-rentabilidade')}
          />
          
          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>INDUSTRIAL / OFICINA</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                 <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Selecionar Projeto:</label>
                 <select 
                   className="input-base" 
                   style={{ fontSize: '0.8rem', width: '100%', padding: '0.4rem' }}
                   value={selectedProjectId}
                   onChange={(e) => setSelectedProjectId(e.target.value)}
                 >
                   {projects.map(p => (
                     <option key={p.id} value={p.id}>{p.cliente_name} - {p.ambiente}</option>
                   ))}
                 </select>
                 <button 
                  onClick={() => loadReportData('ind-romaneio', { projectId: selectedProjectId })}
                  style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.75rem' }} 
                  className={`btn ${activeReport === 'ind-romaneio' ? 'btn-primary' : 'btn-outline'}`}
                 >
                    Gerar Romaneio
                 </button>
              </div>
              <ReportMenuItem 
                icon={<AlertCircle size={18} />} 
                label="Auditoria de Desvios" 
                active={activeReport === 'ind-desvios'}
                onClick={() => loadReportData('ind-desvios')}
              />
            </div>
          </div>

          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>COMPRAS / LOGÍSTICA</p>
            <ReportMenuItem 
              icon={<ShoppingCart size={18} />} 
              label="Necessidade de Compras" 
              active={activeReport === 'com-necessidade'}
              onClick={() => loadReportData('com-necessidade')}
            />
          </div>
        </aside>

        {/* Visualização de Dados */}
        <main className="card" style={{ padding: '1.5rem', minHeight: '500px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
          {!activeReport ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
               <div>
                  <BarChart3 size={64} style={{ opacity: 0.1, marginBottom: '1.5rem', color: 'var(--primary)' }} />
                  <p style={{ fontWeight: '500' }}>Selecione um relatório ao lado para extração de inteligência.</p>
               </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                 <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {activeReport.split('-')[1].toUpperCase()}
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Processado em {new Date().toLocaleString()}</span>
                 </div>
                 <button 
                  onClick={handleExportPdf}
                  className="btn btn-primary" 
                  disabled={loading || reportData.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
                 >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />} EXPORTAR PDF
                 </button>
              </div>

              {loading ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                   <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
                   <p style={{ color: 'var(--text-muted)' }}>Executando queries no banco analítico...</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--background)', textAlign: 'left' }}>
                        {(reportData.length > 0 ? Object.keys(reportData[0]) : []).map(k => (
                          <th key={k} style={{ padding: '1rem', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                            {k.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                             Nenhum dado encontrado para o filtro selecionado.
                          </td>
                        </tr>
                      ) : (
                        reportData.map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                            {Object.values(row).map((v: any, j) => (
                              <td key={j} style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {typeof v === 'number' && v > 1000 ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : v?.toString()}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
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
      padding: '0.85rem 1rem',
      borderRadius: '0.75rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      background: active ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
      border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
      color: active ? 'var(--primary)' : 'var(--text)',
      boxShadow: active ? '0 0 15px rgba(212, 175, 55, 0.1)' : 'none'
    }}
  >
    <div style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}>{icon}</div>
    <span style={{ fontSize: '0.85rem', fontWeight: active ? '700' : '500' }}>{label}</span>
  </button>
);

export default ReportsPage;
