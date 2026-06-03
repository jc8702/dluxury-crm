import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  Download,
  BarChart3,
  TrendingUp,
  AlertCircle,
  ShoppingCart,
  Loader2,
  FileText,
  LayoutDashboard,
  Calendar,
  Layers,
  CheckCircle,
} from 'lucide-react';
import { reportService } from '../../services/reportService';
import { api } from '../../lib/api';
import { useCrmStore as useCRM } from '../../stores/useCrmStore';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../components/common';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#6366f1'];

const ReportsPage: React.FC = () => {
  const { info: toastInfo } = useToast();
  const { projects } = useCRM();
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
      setReportData(data || []);
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
        const prj = projects.find((p) => p.id === selectedProjectId);
        await reportService.generateRomaneioProducao(prj?.ambiente || 'Projeto', reportData);
      } else {
        toastInfo('Exportação para este relatório está sendo preparada.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Renderiza gráfico reativo com base no tipo de relatório ativo
  const renderChart = () => {
    if (reportData.length === 0) return null;

    if (activeReport === 'fin-rentabilidade') {
      // Mapear dados para bar chart
      const chartData = reportData.map((item) => ({
        name: (item.projeto || item.name || '').substring(0, 15),
        'Valor Venda': Number(item.valor_venda || item.receita || 0),
        'Custo Insumos': Number(item.custo_material || item.custo || 0),
        'Margem Líquida': Number(item.margem_valor || item.lucro || 0),
      }));

      return (
        <Card className="mb-6 border-border/50">
          <CardHeader>
            <CardTitle className="text-xs font-black tracking-widest uppercase italic text-primary">
              Análise de Rentabilidade por Projeto
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--surface))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="Valor Venda" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Custo Insumos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Margem Líquida" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }

    if (activeReport === 'com-necessidade') {
      const chartData = reportData.slice(0, 8).map((item) => ({
        name: (item.material || item.sku || '').substring(0, 15),
        'Qtd Necessária': Number(item.quantidade_necessaria || item.quantidade || 0),
        'Qtd Estoque': Number(item.quantidade_estoque || item.estoque || 0),
      }));

      return (
        <Card className="mb-6 border-border/50">
          <CardHeader>
            <CardTitle className="text-xs font-black tracking-widest uppercase italic text-primary">
              Necessidade de Matéria-Prima em Estoque
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--surface))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="Qtd Necessária" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Qtd Estoque" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-border pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
              <BarChart3 className="text-primary w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">
              Business Intelligence
            </span>
          </div>
          <h1 className="text-5xl font-black italic tracking-tighter">
            CENTRAL DE{' '}
            <span className="text-primary underline decoration-primary/30 underline-offset-8">
              RELATÃ“RIOS
            </span>
          </h1>
          <p className="text-muted-foreground mt-4 font-medium max-w-xl leading-relaxed">
            Métricas de produção marcenaria, fluxo de caixa, custos integrados de peças e insumos
            para auditoria gerencial.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Menu Lateral de Relatórios */}
        <aside className="md:col-span-3 space-y-6">
          <Card className="glass-elevated rounded-3xl border border-border">
            <CardHeader>
              <CardTitle className="text-xs font-black tracking-widest uppercase italic">
                Painéis Financeiros
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-4 pt-0">
              <ReportMenuItem
                icon={<TrendingUp size={18} />}
                label="Rentabilidade de Projetos"
                active={activeReport === 'fin-rentabilidade'}
                onClick={() => loadReportData('fin-rentabilidade')}
              />
            </CardContent>
          </Card>

          <Card className="glass-elevated rounded-3xl border border-border">
            <CardHeader>
              <CardTitle className="text-xs font-black tracking-widest uppercase italic">
                Operacional & Produção
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-4 pt-0">
              {projects.length > 0 && (
                <div className="bg-muted/40 p-4 rounded-2xl border border-border flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Selecionar Projeto
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-primary appearance-none"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} className="bg-neutral-900">
                          {p.cliente_name || 'N/A'} - {p.ambiente}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant={activeReport === 'ind-romaneio' ? 'primary' : 'outline'}
                    size="sm"
                    className="w-full h-10 font-bold uppercase tracking-wider text-xs italic"
                    onClick={() => loadReportData('ind-romaneio', { projectId: selectedProjectId })}
                  >
                    Gerar Romaneio
                  </Button>
                </div>
              )}

              <ReportMenuItem
                icon={<AlertCircle size={18} />}
                label="Auditoria de Desvios"
                active={activeReport === 'ind-desvios'}
                onClick={() => loadReportData('ind-desvios')}
              />
            </CardContent>
          </Card>

          <Card className="glass-elevated rounded-3xl border border-border">
            <CardHeader>
              <CardTitle className="text-xs font-black tracking-widest uppercase italic">
                Suprimentos & Compras
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-4 pt-0">
              <ReportMenuItem
                icon={<ShoppingCart size={18} />}
                label="Necessidade de Compras"
                active={activeReport === 'com-necessidade'}
                onClick={() => loadReportData('com-necessidade')}
              />
            </CardContent>
          </Card>
        </aside>

        {/* Quadro Principal de BI */}
        <main className="md:col-span-9">
          {!activeReport ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-elevated p-8 text-center rounded-[2.5rem] border border-dashed border-border col-span-2 py-20">
                <LayoutDashboard className="w-16 h-16 text-primary/20 mx-auto mb-6" />
                <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2">
                  QUETIONADOR DE BI DESATIVADO
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto text-xs uppercase tracking-wider font-medium leading-relaxed mb-6">
                  Selecione um dos relatórios do menu ao lado para extrair inteligência, renderizar
                  gráficos interativos e exportar documentos PDF oficiais.
                </p>
              </Card>

              {[
                {
                  title: 'Rentabilidade',
                  desc: 'Análise de margem por contrato, deduzindo chapas MDF, fita de borda e ferragens vinculadas.',
                  icon: TrendingUp,
                },
                {
                  title: 'Romaneio Técnico',
                  desc: 'Lista detalhada de peças prontas para a expedição e entrega na obra com etiquetas.',
                  icon: Layers,
                },
                {
                  title: 'Desvios de Produção',
                  desc: 'Identificação de retrabalhos de corte ou peças refeitas por falhas no processo.',
                  icon: AlertCircle,
                },
                {
                  title: 'Planejamento de Compras',
                  desc: 'Previsão de faltas de insumos com base em orçamentos recém-fechados no funil.',
                  icon: ShoppingCart,
                },
              ].map((box, i) => (
                <div
                  key={i}
                  className="glass-elevated p-6 rounded-[2rem] border border-border/40 hover:border-primary/20 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-primary/5 rounded-xl border border-primary/10 text-primary">
                      <box.icon className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-white italic">
                      {box.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    {box.desc}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Gráficos em Tempo Real */}
              {renderChart()}

              {/* Tabela de Dados e Ações */}
              <Card className="glass-elevated rounded-[2.5rem] overflow-hidden border border-border shadow-2xl">
                <CardHeader className="flex flex-row justify-between items-center border-b border-border p-6 flex-wrap gap-4 bg-muted/10">
                  <div>
                    <CardTitle className="text-lg font-black tracking-tighter uppercase italic flex items-center gap-2">
                      <FileText className="text-primary w-5 h-5" />
                      {activeReport.split('-').pop()?.toUpperCase()}
                    </CardTitle>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Compilado em {new Date().toLocaleDateString('pt-BR')} Ã s{' '}
                      {new Date().toLocaleTimeString('pt-BR')}
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleExportPdf}
                    disabled={loading || reportData.length === 0}
                    className="h-11 px-6 font-black italic tracking-tight text-xs flex items-center gap-2 shadow-lg shadow-primary/10"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      <Download size={14} />
                    )}{' '}
                    EXPORTAR PDF
                  </Button>
                </CardHeader>

                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                      <Loader2 className="animate-spin w-10 h-10 text-primary" />
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                        Consultando banco de dados...
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#0A0A0A] border-b border-border sticky top-0 z-10">
                            {(reportData.length > 0 ? Object.keys(reportData[0]) : []).map((k) => (
                              <th
                                key={k}
                                className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground italic"
                              >
                                {k.replace(/_/g, ' ')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {reportData.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="px-6 py-24 text-center">
                                <AlertCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground italic">
                                  Nenhum dado retornado para os filtros atuais
                                </p>
                              </td>
                            </tr>
                          ) : (
                            reportData.map((row, i) => (
                              <tr key={i} className="hover:bg-muted/20 transition-colors">
                                {Object.values(row).map((v: any, j) => (
                                  <td
                                    key={j}
                                    className="px-6 py-4 text-xs font-semibold text-muted-foreground font-mono"
                                  >
                                    {typeof v === 'number' && v > 1000
                                      ? v.toLocaleString('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL',
                                        })
                                      : v?.toString()}
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
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const ReportMenuItem: React.FC<{
  icon: any;
  label: string;
  onClick: () => void;
  active: boolean;
}> = ({ icon, label, onClick, active }) => (
  <Button
    variant={active ? 'primary' : 'ghost'}
    onClick={onClick}
    className={`w-full justify-start rounded-2xl h-12 font-bold uppercase tracking-wider text-xs border ${
      active
        ? 'border-primary/20 bg-primary/10 text-primary shadow-[0_0_15px_rgba(212,175,55,0.05)]'
        : 'border-transparent text-muted-foreground hover:bg-muted/10'
    }`}
  >
    <div className={`mr-3 ${active ? 'text-primary' : 'text-muted-foreground'}`}>{icon}</div>
    <span className="italic">{label}</span>
  </Button>
);

export default ReportsPage;
