import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, DollarSign, CreditCard, ArrowUpRight, ArrowDownLeft, 
  Layers, AlertTriangle, CheckCircle, PieChart as PieChartIcon, 
  AlertCircle, Repeat, RefreshCw, Activity, Wallet, Calendar,
  ExternalLink, ChevronRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ReferenceLine
} from 'recharts';
import { CardSkeleton, TableSkeleton } from '../design-system/components/Skeleton';
import { KPIFinanceiro, CapitalGiroHistorico } from '../modules/financeiro/domain/types';

// ────────────────────────────────────────────────────────────────────────────────
// UTILS
// ────────────────────────────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const COLORS = ['#f59e0b', '#10b981', '#facc15', '#ef4444', '#8b5cf6', '#6366f1'];

// ────────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [stats, setStats] = useState<KPIFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [capitalGiroHistorico, setCapitalGiroHistorico] = useState<CapitalGiroHistorico[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const token = localStorage.getItem('dluxury_token') || '';
    try {
      const [dashRes, cgRes] = await Promise.all([
        fetch('/api/financeiro/relatorios?type=dashboard', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/financeiro/relatorios?type=capital_giro', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
      ]);
      if (dashRes.success) setStats(dashRes.data);
      if (cgRes.success) setCapitalGiroHistorico(cgRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
    }
  };

  const atalhos = [
    { to: '/financeiro/classes', icon: Layers, title: 'Plano Contas', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { to: '/financeiro/titulos-receber', icon: ArrowDownLeft, title: 'A Receber', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { to: '/financeiro/titulos-pagar', icon: ArrowUpRight, title: 'A Pagar', color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { to: '/financeiro/recorrentes', icon: Repeat, title: 'Fixas', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { to: '/financeiro/conciliacao', icon: RefreshCw, title: 'OFX', color: 'text-sky-400', bg: 'bg-sky-400/10' },
    { to: '/financeiro/dre', icon: PieChartIcon, title: 'DRE', color: 'text-violet-400', bg: 'bg-violet-400/10' },
    { to: '/financeiro/aging', icon: AlertCircle, title: 'Aging', color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { to: '/financeiro/fluxo-caixa', icon: TrendingUp, title: 'Fluxo Caixa', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-10 font-sans selection:bg-amber-500/30">
      <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1 w-12 bg-amber-500 rounded-full" />
              <span className="text-[10px] font-black tracking-[0.3em] text-amber-500 uppercase">Intelligence System</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none">
              Central <span className="text-amber-500">Financeira</span>
            </h1>
            <p className="text-slate-400 mt-3 max-w-xl text-sm font-medium leading-relaxed">
              Gestão executiva de solvência, fluxo de caixa projetado e inteligência analítica de dados industriais.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/financeiro/contas" className="px-5 py-2.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2">
              <Wallet size={16} className="text-amber-500" /> CONTAS BANCÁRIAS
            </Link>
            <Link to="/financeiro/fluxo-caixa" className="px-5 py-2.5 rounded-lg text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all shadow-[0_0_25px_rgba(245,158,11,0.2)] flex items-center gap-2">
              <TrendingUp size={16} /> FLUXO PROJETADO
            </Link>
          </div>
        </header>

        {/* Shortcuts Grid */}
        <nav className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 mb-10">
          {atalhos.map((item, i) => (
            <Link 
              key={i} 
              to={item.to} 
              className="glass p-4 rounded-xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 group border-white/5 hover:border-amber-500/30"
            >
              <div className={`p-3 rounded-xl ${item.bg} ${item.color} transition-transform group-hover:scale-110`}>
                <item.icon size={22} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 group-hover:text-white">{item.title}</span>
            </Link>
          ))}
        </nav>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1,2,3,4].map(n => <div key={n} className="h-32 bg-white/5 rounded-2xl animate-pulse" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 h-[400px] bg-white/5 rounded-2xl animate-pulse" />
              <div className="h-[400px] bg-white/5 rounded-2xl animate-pulse" />
            </div>
          </div>
        ) : stats && (
          <div className="grid grid-cols-12 gap-6 pb-20">

            {/* Row 1: KPI Cards */}
            <KPIItem 
              label="Compromissos (30d)" 
              value={stats.a_pagar_30d} 
              icon={ArrowUpRight} 
              color="text-rose-500" 
              borderColor="border-rose-500/50"
              desc="Pagamentos previstos para o ciclo atual"
              colSpan="md:col-span-3"
            />
            
            <KPIItem 
              label="Risco de Inadimplência" 
              value={stats.vencidos_total} 
              icon={AlertTriangle} 
              color="text-amber-400" 
              borderColor="border-amber-400/50"
              desc="Títulos vencidos há mais de 5 dias"
              colSpan="md:col-span-3"
            />

            <div className="col-span-12 md:col-span-6 glass p-6 rounded-2xl border-white/5 relative overflow-hidden flex flex-col justify-between group">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                <Activity size={120} />
              </div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Capital de Giro Disponível</h3>
                  <p className="text-sm font-medium text-slate-400">Poder de solvência imediata do negócio</p>
                </div>
                <div className={`p-2 rounded-lg ${(stats.capital_de_giro || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  <Activity size={20} />
                </div>
              </div>

              <div className="flex items-baseline gap-4">
                <div className={`text-4xl font-black tracking-tighter ${(stats.capital_de_giro || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {fmt(stats.capital_de_giro || 0)}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                  Status: {(stats.capital_de_giro || 0) >= 0 ? 'Saudável' : 'Crítico'}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 text-[10px] font-bold text-slate-400 border-t border-white/5 pt-4">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500/50" /> {fmt(stats.a_receber_30d)} Recebíveis
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-rose-500/50" /> {fmt(stats.a_pagar_30d)} Exigíveis
                </div>
              </div>
            </div>

            {/* Row 2: Main Chart and Accounts */}
            <div className="col-span-12 md:col-span-8 space-y-6">
              <div className="glass p-8 rounded-2xl border-white/5 h-[450px]">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black tracking-tighter uppercase italic">Evolução do Giro</h3>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Histórico analítico semestral</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-sm" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Giro Nominal</span>
                    </div>
                  </div>
                </div>

                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={capitalGiroHistorico}>
                      <defs>
                        <linearGradient id="colorGiro" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                      <XAxis 
                        dataKey="label" 
                        stroke="rgba(255,255,255,0.2)" 
                        fontSize={10} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.2)" 
                        fontSize={10} 
                        tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                      />
                      <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" opacity={0.3} />
                      <Area 
                        type="monotone" 
                        dataKey="capital" 
                        stroke="#f59e0b" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorGiro)" 
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-2xl border-white/5">
                   <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="text-emerald-500" size={16} />
                    <h3 className="text-[11px] font-black uppercase tracking-widest italic">Vencimentos (Próx. 7 Dias)</h3>
                  </div>
                  <div className="space-y-3">
                    {(stats.proximos_vencimentos || []).length === 0 ? (
                      <div className="py-6 text-center text-slate-500 text-xs font-medium">Nenhum vencimento próximo</div>
                    ) : (
                      stats.proximos_vencimentos.map((v, i) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${v.tipo === 'pagar' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <div>
                              <div className="text-[11px] font-bold text-slate-200">{v.numero_titulo}</div>
                              <div className="text-[10px] text-slate-500 font-medium uppercase">{new Date(v.data_vencimento).toLocaleDateString('pt-BR')}</div>
                            </div>
                          </div>
                          <div className={`text-[12px] font-black font-mono ${v.tipo === 'pagar' ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {v.tipo === 'pagar' ? '-' : '+'} {fmt(v.valor)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="glass p-6 rounded-2xl border-white/5">
                   <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="text-amber-500" size={16} />
                    <h3 className="text-[11px] font-black uppercase tracking-widest italic">Top Inadimplentes</h3>
                  </div>
                  <div className="space-y-3">
                    {(stats.top5_inadimplentes || []).map((cli, i) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-rose-500/[0.03] border border-rose-500/10 hover:bg-rose-500/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-[10px] font-black text-rose-500">{i+1}</div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-200">{cli.cliente_nome}</div>
                            <div className="text-[10px] text-rose-400/60 font-medium uppercase tracking-tighter">{cli.dias_atraso} dias de atraso</div>
                          </div>
                        </div>
                        <div className="text-[12px] font-black font-mono text-rose-500">
                          {fmt(cli.total_vencido)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2 Sidebar: Expense Mix and Accounts */}
            <div className="col-span-12 md:col-span-4 space-y-6">
              <div className="glass p-8 rounded-2xl border-white/5 h-[400px]">
                <h3 className="text-[11px] font-black uppercase tracking-widest mb-6 italic text-center">Mix de Despesas</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={stats.despesas_por_classe || []} 
                        innerRadius={65} 
                        outerRadius={90} 
                        paddingAngle={5} 
                        dataKey="total" 
                        nameKey="classe"
                        stroke="none"
                      >
                        {(stats.despesas_por_classe || []).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        iconType="circle" 
                        iconSize={6} 
                        wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '20px' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass p-6 rounded-2xl border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[11px] font-black uppercase tracking-widest italic">Saldos Disponíveis</h3>
                  <Link to="/financeiro/contas" className="text-amber-500 p-1 hover:bg-amber-500/10 rounded transition-colors">
                    <ExternalLink size={14} />
                  </Link>
                </div>
                <div className="space-y-4">
                  {(stats.contas || []).map((c, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>{c.nome}</span>
                        <span className={c.saldo_atual >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{fmt(c.saldo_atual)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${c.saldo_atual >= 0 ? 'bg-emerald-500/40' : 'bg-rose-500/40'}`} 
                          style={{ width: `${Math.min(100, (Math.abs(c.saldo_atual) / stats.saldo_total) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex justify-between items-center">
                  <div>
                    <div className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">Saldo Consolidado</div>
                    <div className="text-xl font-black tracking-tighter text-amber-500 font-mono">{fmt(stats.saldo_total)}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500 text-black">
                    <DollarSign size={20} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ────────────────────────────────────────────────────────────────────────────────

function KPIItem({ label, value, icon: Icon, color, borderColor, desc, colSpan }: any) {
  return (
    <div className={`col-span-12 ${colSpan} glass p-6 rounded-2xl border-white/5 border-l-4 ${borderColor} group hover:bg-white/[0.04] transition-all`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 leading-tight">{label}</span>
        <div className={`p-2 rounded-lg bg-slate-900 ${color} group-hover:scale-110 transition-transform`}>
          <Icon size={18} />
        </div>
      </div>
      <div className={`text-3xl font-black tracking-tighter ${color} mb-2 font-mono`}>
        {fmt(value)}
      </div>
      <p className="text-[11px] font-medium text-slate-500 leading-relaxed italic">{desc}</p>
    </div>
  );
}
