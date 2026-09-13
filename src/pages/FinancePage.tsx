import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Layers,
  AlertTriangle,
  CheckCircle,
  PieChart as PieChartIcon,
  AlertCircle,
  Repeat,
  RefreshCw,
  Activity,
  Wallet,
  ExternalLink,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from 'recharts';

import type { KPIFinanceiro, CapitalGiroHistorico } from '../modules/financeiro/domain/types';
import { Button, Card, Badge, Input } from '../components/ui';

// ────────────────────────────────────────────────────────────────────────────────
// UTILS
// ────────────────────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const COLORS = [
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--secondary))',
  'hsl(var(--destructive))',
  'hsl(var(--info))',
  'hsl(var(--primary))',
];

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
        fetch('/api/financeiro/relatorios?type=dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
        fetch('/api/financeiro/relatorios?type=capital_giro', {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
      ]);
      if (dashRes.success) setStats(dashRes.data);
      if (cgRes.success) setCapitalGiroHistorico(Array.isArray(cgRes.data) ? cgRes.data : []);
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
    }
  };

  const atalhos = [
    {
      to: '/financeiro/classes',
      icon: Layers,
      title: 'Plano Contas',
      color: 'text-accent',
      bg: 'bg-[var(--ui-color-warning-soft)]',
    },
    {
      to: '/financeiro/titulos-receber',
      icon: ArrowDownLeft,
      title: 'A Receber',
      color: 'text-[hsl(var(--success))]',
      bg: 'bg-[var(--ui-color-success-soft)]',
    },
    {
      to: '/financeiro/titulos-pagar',
      icon: ArrowUpRight,
      title: 'A Pagar',
      color: 'text-[hsl(var(--destructive))]',
      bg: 'bg-[var(--ui-color-danger-soft)]',
    },
    {
      to: '/financeiro/recorrentes',
      icon: Repeat,
      title: 'Fixas',
      color: 'text-[hsl(var(--success))]',
      bg: 'bg-[var(--ui-color-success-soft)]',
    },
    {
      to: '/financeiro/conciliacao',
      icon: RefreshCw,
      title: 'OFX',
      color: 'text-[hsl(var(--info))]',
      bg: 'bg-[var(--ui-color-info-soft)]',
    },
    {
      to: '/financeiro/dre',
      icon: PieChartIcon,
      title: 'DRE',
      color: 'text-[hsl(var(--primary))]',
      bg: 'bg-[var(--ui-color-primary-50)]',
    },
    {
      to: '/financeiro/aging',
      icon: AlertCircle,
      title: 'Aging',
      color: 'text-[hsl(var(--warning))]',
      bg: 'bg-[var(--ui-color-warning-soft)]',
    },
    {
      to: '/financeiro/fluxo-caixa',
      icon: TrendingUp,
      title: 'Fluxo Caixa',
      color: 'text-accent',
      bg: 'bg-[var(--ui-color-warning-soft)]',
    },
    {
      to: '/financeiro/rentabilidade',
      icon: Activity,
      title: 'Rentabilidade',
      color: 'text-[hsl(var(--success))]',
      bg: 'bg-[var(--ui-color-success-soft)]',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 font-body selection:bg-[var(--ui-color-warning-soft)]">
      <div className="max-w-[1440px] mx-auto animate-in fade-in duration-700">
        {/* Header Section — DM Sans para títulos/ações, Source Sans 3 para textos */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1 w-12 bg-[hsl(var(--warning))] rounded-full" />
              <span className="text-xs font-display font-bold tracking-[0.3em] text-accent uppercase">
                Intelligence System
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight leading-none">
              Central <span className="text-accent">Financeira</span>
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm font-body leading-relaxed">
              Gestão executiva de solvência, fluxo de caixa projetado e inteligência analítica de
              dados industriais.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => (window.location.hash = '#/financeiro/contas')}
              className="gap-2"
            >
              <Wallet size={16} className="text-accent" /> CONTAS BANCÁRIAS
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => (window.location.hash = '#/financeiro/fluxo-caixa')}
              className="gap-2 shadow-[var(--ui-shadow-1)]"
            >
              <TrendingUp size={16} /> FLUXO PROJETADO
            </Button>
          </div>
        </header>

        {/* Shortcuts Grid — spacing 12px (múltiplo 4), raio 12px */}
        <nav className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 mb-8">
          {atalhos.map((item, i) => (
            <Link
              key={i}
              to={item.to}
              className="glass p-4 rounded-[var(--ui-radius-lg)] flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 group border border-border hover:border-[hsl(var(--warning))]/30"
            >
              <div
                className={`p-3 rounded-[var(--ui-radius-md)] ${item.bg} ${item.color} transition-transform group-hover:scale-110`}
              >
                <item.icon size={22} />
              </div>
              <span className="text-xs font-display font-bold uppercase tracking-wider text-foreground group-hover:text-primary">
                {item.title}
              </span>
            </Link>
          ))}
        </nav>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-32 bg-muted rounded-[var(--ui-radius-lg)] animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 h-[400px] bg-muted rounded-[var(--ui-radius-lg)] animate-pulse" />
              <div className="h-[400px] bg-muted rounded-[var(--ui-radius-lg)] animate-pulse" />
            </div>
          </div>
        ) : (
          stats && (
            <div className="grid grid-cols-12 gap-6 pb-20">
              {/* Row 1: KPI Cards */}
              <KPIItem
                label="Compromissos (30d)"
                value={stats.a_pagar_30d}
                icon={ArrowUpRight}
                color="text-[hsl(var(--destructive))]"
                borderColor="border-[hsl(var(--destructive))]/50"
                desc="Pagamentos previstos para o ciclo atual"
                colSpan="md:col-span-3"
              />

              <KPIItem
                label="Risco de Inadimplência"
                value={stats.vencidos_total}
                icon={AlertTriangle}
                color="text-[hsl(var(--warning))]"
                borderColor="border-[hsl(var(--warning))]/50"
                desc="Títulos vencidos há mais de 5 dias"
                colSpan="md:col-span-3"
              />

              <Card className="col-span-12 md:col-span-6 p-6 relative overflow-hidden flex flex-col justify-between group">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                  <Activity size={120} />
                </div>

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xs font-display font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                      Capital de Giro Disponível
                    </h3>
                    <p className="text-sm font-body text-muted-foreground">
                      Poder de solvência imediata do negócio
                    </p>
                  </div>
                  <div
                    className={`p-2 rounded-[var(--ui-radius-md)] ${(stats.capital_de_giro || 0) >= 0 ? 'bg-[var(--ui-color-success-soft)] text-[hsl(var(--success))]' : 'bg-[var(--ui-color-danger-soft)] text-[hsl(var(--destructive))]'}`}
                  >
                    <Activity size={20} />
                  </div>
                </div>

                <div className="flex items-baseline gap-4">
                  <div
                    className={`text-2xl font-display font-bold tracking-tight ${(stats.capital_de_giro || 0) >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`}
                  >
                    {fmt(stats.capital_de_giro || 0)}
                  </div>
                  <Badge tone={(stats.capital_de_giro || 0) >= 0 ? 'success' : 'danger'} className="uppercase tracking-widest">
                    Status: {(stats.capital_de_giro || 0) >= 0 ? 'Saudável' : 'Crítico'}
                  </Badge>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm font-body font-bold text-muted-foreground border-t border-border pt-4">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))]/50" />{' '}
                    {fmt(stats.a_receber_30d)} Recebíveis
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--destructive))]/50" />{' '}
                    {fmt(stats.a_pagar_30d)} Exigíveis
                  </div>
                </div>
              </Card>

              {/* Row 2: Main Chart and Accounts */}
              <div className="col-span-12 md:col-span-8 space-y-6">
                <Card className="p-6 md:p-8 h-[450px]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-display font-semibold tracking-tight uppercase">
                        Evolução do Giro
                      </h3>
                      <p className="text-xs font-display font-medium text-muted-foreground uppercase tracking-widest">
                        Histórico analítico semestral
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[hsl(var(--warning))] rounded-sm" />
                        <span className="text-xs font-display font-bold text-muted-foreground uppercase">
                          Giro Nominal
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={capitalGiroHistorico}>
                        <defs>
                          <linearGradient id="colorGiro" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="label"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: 'var(--ui-radius-lg)',
                            fontSize: '12px',
                          }}
                          itemStyle={{ color: 'hsl(var(--accent))', fontWeight: 'bold' }}
                        />
                        <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" opacity={0.3} />
                        <Area
                          type="monotone"
                          dataKey="capital"
                          stroke="hsl(var(--accent))"
                          strokeWidth={4}
                          fillOpacity={1}
                          fill="url(#colorGiro)"
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="text-[hsl(var(--success))]" size={16} />
                      <h3 className="text-xs font-display font-bold uppercase tracking-widest">
                        Vencimentos (Próx. 7 Dias)
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {(stats.proximos_vencimentos || []).length === 0 ? (
                        <div className="py-6 text-center text-muted-foreground text-sm font-body">
                          Nenhum vencimento próximo
                        </div>
                      ) : (
                        stats.proximos_vencimentos.map((v, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center p-3 rounded-[var(--ui-radius-md)] bg-muted border border-border hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${v.tipo === 'pagar' ? 'bg-[hsl(var(--destructive))]' : 'bg-[hsl(var(--success))]'}`}
                              />
                              <div>
                                <div className="text-sm font-body font-bold text-foreground">
                                  {v.numero_titulo}
                                </div>
                                <div className="text-xs font-display text-muted-foreground font-medium uppercase">
                                  {new Date(v.data_vencimento).toLocaleDateString('pt-BR')}
                                </div>
                              </div>
                            </div>
                            <div
                              className={`text-xs font-mono font-bold ${v.tipo === 'pagar' ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--success))]'}`}
                            >
                              {v.tipo === 'pagar' ? '-' : '+'} {fmt(v.valor)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="text-accent" size={16} />
                      <h3 className="text-xs font-display font-bold uppercase tracking-widest">
                        Top Inadimplentes
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {(stats.top5_inadimplentes || []).map((cli, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center p-3 rounded-xl bg-[var(--ui-color-danger-soft)] border border-[hsl(var(--destructive))]/10 hover:bg-[var(--ui-color-danger-soft)]/70 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-[var(--ui-color-danger-soft)] flex items-center justify-center text-sm font-black text-[hsl(var(--destructive))]">
                              {i + 1}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-foreground">
                                {cli.cliente_nome}
                              </div>
                              <div className="text-xs text-[hsl(var(--destructive))]/60 font-medium uppercase tracking-tighter">
                                {cli.dias_atraso} dias de atraso
                              </div>
                            </div>
                          </div>
                          <div className="text-[12px] font-black font-mono text-[hsl(var(--destructive))]">
                            {fmt(cli.total_vencido)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Row 2 Sidebar: Expense Mix and Accounts */}
              <div className="col-span-12 md:col-span-4 space-y-6">
                <Card className="p-6 md:p-8 h-[400px]">
                  <h3 className="text-xs font-display font-bold uppercase tracking-widest mb-6 text-center">
                    Mix de Despesas
                  </h3>
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
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: 'var(--ui-radius-lg)',
                            fontSize: '12px',
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          iconSize={6}
                          wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-muted/20 to-transparent">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-display font-bold uppercase tracking-widest">
                      Saldos Disponíveis
                    </h3>
                    <Link
                      to="/financeiro/contas"
                      className="text-accent p-1 hover:bg-[var(--ui-color-warning-soft)] rounded-[var(--ui-radius-md)] transition-colors"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {(stats.contas || []).map((c, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          <span>{c.nome}</span>
                          <span
                            className={
                              c.saldo_atual >= 0
                                ? 'text-[hsl(var(--success))]'
                                : 'text-[hsl(var(--destructive))]'
                            }
                          >
                            {fmt(c.saldo_atual)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${c.saldo_atual >= 0 ? 'bg-[hsl(var(--success))]/40' : 'bg-[hsl(var(--destructive))]/40'}`}
                            style={{
                              width: `${Math.min(100, (Math.abs(c.saldo_atual) / stats.saldo_total) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 rounded-[var(--ui-radius-lg)] bg-[var(--ui-color-warning-soft)] border border-[hsl(var(--warning))]/10 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-display font-bold text-accent uppercase tracking-[0.2em] mb-1">
                        Saldo Consolidado
                      </div>
                      <div className="text-xl font-display font-bold tracking-tight text-accent">
                        {fmt(stats.saldo_total)}
                      </div>
                    </div>
                    <div className="p-2 rounded-[var(--ui-radius-md)] bg-[hsl(var(--warning))] text-accent-foreground">
                      <DollarSign size={20} />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )
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
    <Card
      className={`col-span-12 ${colSpan} p-6 border-l-4 ${borderColor} group`}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-display font-bold uppercase tracking-[0.2em] text-muted-foreground leading-tight">
          {label}
        </span>
        <div
          className={`p-2 rounded-[var(--ui-radius-md)] bg-surface ${color} group-hover:scale-110 transition-transform`}
        >
          <Icon size={18} />
        </div>
      </div>
      <div className={`text-2xl font-display font-bold tracking-tight ${color} mb-2`}>
        {fmt(value)}
      </div>
      <p className="text-sm font-body text-muted-foreground leading-relaxed">{desc}</p>
    </Card>
  );
}