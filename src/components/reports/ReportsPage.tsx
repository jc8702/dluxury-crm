import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { Download, BarChart3, TrendingUp, AlertCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { reportService } from '../../services/reportService';
import { api } from '../../lib/api';
import { useAppContext } from '../../context/AppContext';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../design-system/components';

const ReportsPage: React.FC = () => {
  const { info: toastInfo } = useToast();
  const { projects } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadReportData = async (type: string, params: any = {}) => {
    setLoading(true);
    try {
      const data = await api.reports.get(type, params.projectId);
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
        toastInfo('Exportação para este relatório está sendo preparada.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container anim-fade-in" style={{ padding: '1rem' }}>
      {/* Header */}
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <BarChart3 style={{ color: 'hsl(var(--primary))' }} /> CENTRAL DE RELATÓRIOS
        </h1>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem', margin: 0 }}>Inteligência industrial e financeira em documentos acionáveis</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }} className="md:grid-cols-[280px_1fr]">
        <style>{`
          @media (min-width: 768px) {
            .md\\:grid-cols-\\[280px_1fr\\] {
              grid-template-columns: 280px 1fr;
            }
          }
        `}</style>
        
        {/* Menu de Tipos */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Financeiro</p>
            <ReportMenuItem 
              icon={<TrendingUp size={18} />} 
              label="Rentabilidade de Projetos" 
              active={activeReport === 'fin-rentabilidade'}
              onClick={() => loadReportData('fin-rentabilidade')}
            />
          </div>
          
          <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>Industrial / Oficina</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ padding: '0.75rem', background: 'hsl(var(--surface))', borderRadius: '12px', border: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 <label style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 700 }}>Selecionar Projeto:</label>
                 <select 
                   className="input-base" 
                   style={{ 
                     fontSize: '0.8rem', 
                     width: '100%', 
                     padding: '0.5rem',
                     background: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     borderRadius: '8px',
                     color: 'white',
                     outline: 'none'
                   }}
                   value={selectedProjectId}
                   onChange={(e) => setSelectedProjectId(e.target.value)}
                 >
                   {projects.map(p => (
                     <option key={p.id} value={p.id} style={{ background: '#1e293b' }}>{p.cliente_name} - {p.ambiente}</option>
                   ))}
                 </select>
                 <Button 
                   variant={activeReport === 'ind-romaneio' ? 'primary' : 'outline'}
                   size="sm"
                   onClick={() => loadReportData('ind-romaneio', { projectId: selectedProjectId })}
                   style={{ width: '100%', fontSize: '0.75rem', padding: '0.4rem' }} 
                 >
                   Gerar Romaneio
                 </Button>
              </div>
              
              <ReportMenuItem 
                icon={<AlertCircle size={18} />} 
                label="Auditoria de Desvios" 
                active={activeReport === 'ind-desvios'}
                onClick={() => loadReportData('ind-desvios')}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>Compras / Logística</p>
            <ReportMenuItem 
              icon={<ShoppingCart size={18} />} 
              label="Necessidade de Compras" 
              active={activeReport === 'com-necessidade'}
              onClick={() => loadReportData('com-necessidade')}
            />
          </div>
        </aside>

        {/* Visualização de Dados */}
        <main style={{ display: 'flex', flexDirection: 'column' }}>
          {!activeReport ? (
            <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px' }}>
              <CardContent style={{ textAlign: 'center', padding: '3rem' }}>
                <BarChart3 size={64} style={{ opacity: 0.15, marginBottom: '1.5rem', color: 'hsl(var(--primary))', margin: '0 auto 1.5rem' }} />
                <p style={{ fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>Selecione um relatório ao lado para extração de inteligência.</p>
              </CardContent>
            </Card>
          ) : (
            <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '500px', overflow: 'hidden' }}>
              <CardHeader style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border))', padding: '1.25rem 1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                 <div>
                    <CardTitle style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {activeReport.split('-')[1].toUpperCase()}
                    </CardTitle>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Processado em {new Date().toLocaleString()}</span>
                 </div>
                 
                 <Button 
                   variant="primary"
                   onClick={handleExportPdf}
                   disabled={loading || reportData.length === 0}
                   style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
                 >
                    {loading ? <Loader2 className="anim-spin" size={16} /> : <Download size={16} />} EXPORTAR PDF
                 </Button>
              </CardHeader>

              <CardContent style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '1rem' }}>
                     <Loader2 className="anim-spin" size={32} style={{ color: 'hsl(var(--primary))' }} />
                     <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>Executando queries no banco analítico...</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid hsl(var(--border))' }} className="custom-scrollbar">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'hsl(var(--surface))', borderBottom: '1px solid hsl(var(--border))', textAlign: 'left' }}>
                          {(reportData.length > 0 ? Object.keys(reportData[0]) : []).map(k => (
                            <th key={k} style={{ padding: '1rem', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--muted-foreground))' }}>
                              {k.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.length === 0 ? (
                          <tr>
                            <td colSpan={10} style={{ padding: 0 }}>
                               <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>
                                 Nenhum dado encontrado para o filtro selecionado.
                               </div>
                            </td>
                          </tr>
                        ) : (
                          reportData.map((row, i) => (
                            <tr 
                              key={i} 
                              style={{ 
                                borderBottom: '1px solid hsl(var(--border))', 
                                background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                                transition: 'background 0.2s' 
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--surface-hover))')}
                              onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent')}
                            >
                              {Object.values(row).map((v: any, j) => (
                                <td key={j} style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
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
              </CardContent>
            </Card>
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
      padding: '0.75rem 1rem',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      background: active ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
      border: active ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
      color: active ? 'hsl(var(--primary))' : 'var(--text)',
      boxShadow: active ? '0 0 15px rgba(212, 175, 55, 0.05)' : 'none'
    }}
    onMouseEnter={e => {
      if (!active) e.currentTarget.style.background = 'hsl(var(--surface-hover))';
    }}
    onMouseLeave={e => {
      if (!active) e.currentTarget.style.background = 'transparent';
    }}
  >
    <div style={{ color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>{icon}</div>
    <span style={{ fontSize: '0.85rem', fontWeight: active ? '700' : '500' }}>{label}</span>
  </button>
);

export default ReportsPage;
