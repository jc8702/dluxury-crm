import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, AlertTriangle, DollarSign, 
  Target, Users, ArrowLeft, Activity, Percent, Clock,
  ArrowUpRight, CheckCircle, Edit3, X, Save
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { rentabilidadeService } from '../services/rentabilidadeService.js';
import type { KPIRentabilidade, ProjetoRentabilidade, AlertaRentabilidade, ClienteRentabilidade, GraficoMargemDado } from '../services/rentabilidadeService.js';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function FinanceiroRentabilidadePage() {
  const [periodo, setPeriodo] = useState('mes');
  const [buscaCliente, setBuscaCliente] = useState('');
  
  const [kpis, setKpis] = useState<KPIRentabilidade | null>(null);
  const [projetos, setProjetos] = useState<ProjetoRentabilidade[]>([]);
  const [alertas, setAlertas] = useState<AlertaRentabilidade[]>([]);
  const [clientes, setClientes] = useState<ClienteRentabilidade[]>([]);
  const [graficoDados, setGraficoDados] = useState<GraficoMargemDado[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<ProjetoRentabilidade | null>(null);
  const [saving, setSaving] = useState(false);

  // Campos para edição de custos reais
  const [costMat, setCostMat] = useState('');
  const [costMao, setCostMao] = useState('');
  const [costRetrabalho, setCostRetrabalho] = useState('');
  const [costDesperdicio, setCostDesperdicio] = useState('');
  const [tempoHoras, setTempoHoras] = useState('');
  const [desviosDesc, setDesviosDesc] = useState('');

  useEffect(() => {
    carregarDados();
  }, [periodo, buscaCliente]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [kpiRes, projRes, alertaRes, cliRes, graphRes] = await Promise.all([
        rentabilidadeService.getKPIs(periodo),
        rentabilidadeService.getProjetos(buscaCliente || undefined),
        rentabilidadeService.getAlertas(),
        rentabilidadeService.getPorCliente(),
        rentabilidadeService.getGraficoMargem()
      ]);

      setKpis(kpiRes);
      setProjetos(projRes.projetos || []);
      setAlertas(alertaRes.alertas || []);
      setClientes(cliRes.clientes || []);
      setGraficoDados(graphRes.dados || []);
    } catch (err) {
      console.error('Erro ao carregar dashboard de rentabilidade:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirEdicao = (proj: ProjetoRentabilidade) => {
    setEditingProject(proj);
    setCostMat(String(proj.custo_material_real));
    setCostMao(String(proj.custo_mao_obra_real));
    setCostRetrabalho(String(proj.custo_retrabalho));
    setCostDesperdicio(String(proj.custo_desperdicio_material));
    setTempoHoras(String(proj.tempo_horas_real));
    setDesviosDesc(proj.descricao_desvios || '');
  };

  const salvarCustos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    setSaving(true);
    try {
      const res = await rentabilidadeService.salvarCustosReais({
        id: editingProject.id,
        custo_material_real: parseFloat(costMat) || 0,
        custo_mao_obra_real: parseFloat(costMao) || 0,
        tempo_horas_real: parseFloat(tempoHoras) || 0,
        custo_retrabalho: parseFloat(costRetrabalho) || 0,
        custo_desperdicio_material: parseFloat(costDesperdicio) || 0,
        descricao_desvios: desviosDesc
      });

      if (res.success) {
        setEditingProject(null);
        carregarDados();
      }
    } catch (err) {
      console.error('Erro ao salvar custos reais:', err);
      alert('Falha ao salvar custos reais.');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar mais lucrativos & prejuízos
  const lucrativos = projetos.filter(p => p.status === 'lucrativo').slice(0, 5);
  const prejuizados = projetos.filter(p => p.status === 'prejuizo').slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans selection:bg-amber-500/30">
      <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700 space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/financeiro" className="text-muted-foreground hover:text-primary-foreground transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                <ArrowLeft size={14} /> Voltar ao Financeiro
              </Link>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none mt-2">
              Rentabilidade & <span className="text-amber-500">Margem Real</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-2xl leading-relaxed">
              Análise comparativa real vs. orçado das OPs concluídas para identificar perdas invisíveis, desvios operacionais e calibrar o pricing.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Período</label>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="bg-surface border border-border rounded-lg text-xs px-3 py-2 focus:ring-1 focus:ring-amber-500 font-bold"
              >
                <option value="mes">Último Mês</option>
                <option value="trimestre">Último Trimestre</option>
                <option value="ano">Último Ano</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Filtro Cliente</label>
              <input
                type="text"
                placeholder="Filtrar por nome..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="bg-surface border border-border rounded-lg text-xs px-3 py-2 focus:ring-1 focus:ring-amber-500 w-44 font-semibold text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </header>

        {loading && !kpis ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 py-20">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-32 bg-surface/50 border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            {kpis && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <KPICard
                  title="Receita Realizada"
                  value={fmt(kpis.receita_total)}
                  pct={kpis.variacao_receita}
                  icon={DollarSign}
                  color="text-sky-400"
                  borderColor="border-sky-500/20"
                />
                <KPICard
                  title="Custos Reais"
                  value={fmt(kpis.custo_total)}
                  pct={kpis.variacao_custos}
                  icon={TrendingDown}
                  color="text-rose-400"
                  borderColor="border-rose-500/20"
                  inverse={true}
                />
                <KPICard
                  title="Margem de Lucro"
                  value={fmt(kpis.margem_total)}
                  pct={kpis.variacao_margem}
                  icon={TrendingUp}
                  color="text-emerald-400"
                  borderColor="border-emerald-500/20"
                />
                <KPICard
                  title="Margem Média %"
                  value={`${kpis.margem_media_percentual.toFixed(1)}%`}
                  pct={kpis.variacao_margem_percentual}
                  icon={Percent}
                  color="text-violet-400"
                  borderColor="border-violet-500/20"
                  isAbs={true}
                />
              </div>
            )}

            {/* Alertas Críticos */}
            {alertas.length > 0 && (
              <div className="p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.02] flex items-start gap-4">
                <AlertTriangle className="text-amber-500 w-6 h-6 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Desvios de Margem Detectados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-foreground">
                    {alertas.slice(0, 4).map((alerta, i) => (
                      <div key={i} className="flex justify-between items-center py-1 border-b border-slate-900">
                        <span className="font-semibold text-foreground">{alerta.numero_op} - {alerta.cliente}</span>
                        <span className="font-bold text-rose-500">+{alerta.variacao_percentual.toFixed(1)}% de desvio</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Row 2: Charts and Clients */}
            <div className="grid grid-cols-12 gap-6">
              {/* Line Chart */}
              <div className="col-span-12 lg:col-span-8 glass p-6 md:p-8 rounded-2xl border border-border min-h-[400px]">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold uppercase tracking-tight italic">Evolução de Margem</h3>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Margem Estimada vs. Margem Real</p>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graficoDados}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="mes" stroke="rgba(255,255,255,0.2)" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                      <Line type="monotone" dataKey="margem_estimada" name="Margem Estimada" stroke="#6366f1" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="margem_real" name="Margem Real" stroke="#10b981" strokeWidth={3} dot={false} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart: Clientes Rentabilidade */}
              <div className="col-span-12 lg:col-span-4 glass p-6 md:p-8 rounded-2xl border border-border flex flex-col">
                <h3 className="text-sm font-bold uppercase tracking-widest text-center mb-6 italic">Top Clientes por Margem</h3>
                <div className="h-[220px] flex justify-center">
                  {clientes.length === 0 ? (
                    <div className="flex items-center text-xs text-muted-foreground">Sem dados históricos</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={clientes.slice(0, 5)}
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="margem_total"
                          nameKey="cliente"
                          stroke="none"
                        >
                          {clientes.slice(0, 5).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                        <Legend verticalAlign="bottom" iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: Lucrativos vs Prejuízo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lucrativos */}
              <div className="glass p-6 rounded-2xl border border-border">
                <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
                  <CheckCircle className="text-emerald-500 w-5 h-5" />
                  <h3 className="text-sm font-bold uppercase tracking-widest italic">Top 5 Mais Lucrativos</h3>
                </div>
                <div className="space-y-4">
                  {lucrativos.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-6 text-center">Nenhum projeto altamente lucrativo</div>
                  ) : lucrativos.map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-surface/30 border border-slate-900 hover:border-border hover:bg-surface/60 transition-all group">
                      <div>
                        <div className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                          {p.numero_op}
                          <button onClick={() => abrirEdicao(p)} className="p-1 text-muted-foreground hover:text-amber-500 rounded transition-all cursor-pointer">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">{p.cliente}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-emerald-400">{p.margem_percentual.toFixed(1)}%</div>
                        <div className="text-[9px] text-muted-foreground font-mono mt-0.5">{fmt(p.margem_real)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prejuízos */}
              <div className="glass p-6 rounded-2xl border border-border">
                <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
                  <AlertTriangle className="text-rose-500 w-5 h-5" />
                  <h3 className="text-sm font-bold uppercase tracking-widest italic text-rose-500">Margem Negativa / Alerta</h3>
                </div>
                <div className="space-y-4">
                  {prejuizados.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-6 text-center">Nenhum projeto operando no vermelho</div>
                  ) : prejuizados.map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-surface/30 border border-slate-900 hover:border-border hover:bg-surface/60 transition-all group">
                      <div>
                        <div className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                          {p.numero_op}
                          <button onClick={() => abrirEdicao(p)} className="p-1 text-muted-foreground hover:text-amber-500 rounded transition-all cursor-pointer">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">{p.cliente}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-rose-500">{p.margem_percentual.toFixed(1)}%</div>
                        <div className="text-[9px] text-muted-foreground font-mono mt-0.5">{fmt(p.margem_real)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Clientes Table */}
            <div className="glass p-6 md:p-8 rounded-2xl border border-border">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-6 italic flex items-center gap-2">
                <Users className="text-amber-500 w-4.5 h-4.5" /> Métricas de Margem por Cliente
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4 text-center">Pedidos</th>
                      <th className="py-3 px-4 text-right">Vendas Totais</th>
                      <th className="py-3 px-4 text-right">Custos Reais</th>
                      <th className="py-3 px-4 text-right">Margem Total</th>
                      <th className="py-3 px-4 text-right">Margem Média %</th>
                      <th className="py-3 px-4 text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground font-medium">Nenhum cliente com pedidos concluídos</td>
                      </tr>
                    ) : clientes.map((cli, i) => (
                      <tr key={i} className="border-b border-slate-900 hover:bg-surface/20 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-foreground">{cli.cliente}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-foreground">{cli.total_pedidos}</td>
                        <td className="py-3.5 px-4 text-right text-foreground font-mono">{fmt(cli.total_vendido)}</td>
                        <td className="py-3.5 px-4 text-right text-foreground font-mono">{fmt(cli.total_custos_reais)}</td>
                        <td className="py-3.5 px-4 text-right text-foreground font-mono">{fmt(cli.margem_total)}</td>
                        <td className={`py-3.5 px-4 text-right font-bold ${cli.margem_media_percentual >= 30 ? 'text-emerald-400' : cli.margem_media_percentual > 0 ? 'text-amber-400' : 'text-rose-500'}`}>
                          {cli.margem_media_percentual.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-black ${
                            cli.score_rentabilidade >= 8 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            cli.score_rentabilidade >= 5 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            {cli.score_rentabilidade}/10
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal para Editar Custos Reais (UAU!) */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface/50">
              <div>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Ajuste de Rentabilidade</span>
                <h3 className="text-lg font-black text-foreground uppercase">{editingProject.numero_op} - {editingProject.cliente}</h3>
              </div>
              <button onClick={() => setEditingProject(null)} className="p-2 text-muted-foreground hover:text-primary-foreground rounded-lg hover:bg-muted cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={salvarCustos} className="p-6 space-y-4 text-xs font-semibold text-foreground">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-muted-foreground">Custo Material Real (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costMat}
                    onChange={(e) => setCostMat(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-amber-500 font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-muted-foreground">Custo Mão de Obra Real (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costMao}
                    onChange={(e) => setCostMao(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-amber-500 font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1.5 text-muted-foreground">Retrabalho (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costRetrabalho}
                    onChange={(e) => setCostRetrabalho(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-amber-500 font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-muted-foreground">Desperdício Material (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costDesperdicio}
                    onChange={(e) => setCostDesperdicio(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-amber-500 font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-muted-foreground">Tempo Real (Horas)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tempoHoras}
                    onChange={(e) => setTempoHoras(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-amber-500 font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-muted-foreground">Descrição de Desvios / Motivo do Ajuste</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Retrabalho de montagem por erro de medição na cozinha, desperdício de 1 chapa de MDF 18mm..."
                  value={desviosDesc}
                  onChange={(e) => setDesviosDesc(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-amber-500 text-xs font-semibold placeholder:text-muted-foreground resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2.5 border border-border hover:bg-slate-850 rounded-lg transition-all text-muted-foreground hover:text-primary-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 bg-amber-500 text-black hover:bg-amber-400 font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Ajustes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  pct: number;
  icon: any;
  color: string;
  borderColor: string;
  inverse?: boolean;
  isAbs?: boolean;
}

function KPICard({ title, value, pct, icon: Icon, color, borderColor, inverse = false, isAbs = false }: KPICardProps) {
  let positiveChange = pct > 0;
  if (inverse) positiveChange = !positiveChange;

  return (
    <div className={`glass p-6 rounded-2xl border ${borderColor} flex flex-col justify-between hover:border-slate-700/80 transition-all`}>
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</span>
        <div className={`p-2 bg-surface rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-black font-mono tracking-tight text-foreground">{value}</span>
      </div>
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-2 pt-2 border-t border-slate-900 flex items-center gap-1">
        {pct === 0 ? (
          <span className="text-muted-foreground">-</span>
        ) : positiveChange ? (
          <span className="text-emerald-400">↑ {isAbs ? '' : '+'}{pct.toFixed(1)}%</span>
        ) : (
          <span className="text-rose-500">↓ {pct.toFixed(1)}%</span>
        )}
        <span>vs. Período Anterior</span>
      </div>
    </div>
  );
}
