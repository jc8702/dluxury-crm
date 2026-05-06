import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, DollarSign, CreditCard, ArrowUpRight, ArrowDownLeft, Layers, AlertTriangle, CheckCircle, PieChart as PieChartIcon, AlertCircle, Repeat, RefreshCw, Activity } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ReferenceLine
} from 'recharts';
import { CardSkeleton, TableSkeleton } from '../design-system/components/Skeleton';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const COLORS = ['hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--accent))', '#6366f1'];

export default function FinancePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [capitalGiroHistorico, setCapitalGiroHistorico] = useState<any[]>([]);

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
    } finally {
      setLoading(false);
    }
  };

  const atalhos = [
    { to: '/financeiro/classes', icon: Layers, title: 'Plano de Contas', color: 'hsl(var(--primary))' },
    { to: '/financeiro/titulos-receber', icon: ArrowDownLeft, title: 'A Receber', color: 'hsl(var(--success))' },
    { to: '/financeiro/titulos-pagar', icon: ArrowUpRight, title: 'A Pagar', color: 'hsl(var(--destructive))' },
    { to: '/financeiro/recorrentes', icon: Repeat, title: 'Fixas', color: 'hsl(var(--success))' },
    { to: '/financeiro/conciliacao', icon: RefreshCw, title: 'OFX', color: 'hsl(var(--info))' },
    { to: '/financeiro/dre', icon: PieChartIcon, title: 'DRE', color: 'hsl(var(--accent))' },
    { to: '/financeiro/aging', icon: AlertCircle, title: 'Aging', color: 'hsl(var(--warning))' },
    { to: '/financeiro/fluxo-caixa', icon: TrendingUp, title: 'Fluxo Caixa', color: 'hsl(var(--primary))' },
  ];

  return (
    <div className="page-container anim-fade-in" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
            CENTRAL FINANCEIRA <span style={{ color: 'hsl(var(--primary))', opacity: 0.4 }}>|</span> D'LUXURY
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>Visão executiva de saúde financeira e inteligência de negócio</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/financeiro/contas" className="btn btn-outline"><CreditCard /> BANCOS</Link>
          <Link to="/financeiro/fluxo-caixa" className="btn btn-primary"><TrendingUp /> FLUXO</Link>
        </div>
      </div>

      {/* Atalhos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
        {atalhos.map((item, i) => (
          <Link key={i} to={item.to} className="card glass hover-scale" style={{ padding: '1rem', textDecoration: 'none', textAlign: 'center' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${item.color.replace(')', '/0.09)')}`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', margin: '0 auto 0.5rem' }}>
              <item.icon />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{item.title}</span>
          </Link>
        ))}
      </div>

      {loading ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
            <div className="card glass"><TableSkeleton rows={4} cols={1} /></div>
            <div className="card glass"><TableSkeleton rows={3} cols={1} /></div>
          </div>
        </>
      ) : stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.25rem' }}>

          {/* KPI Cards — Row 1 */}
          {[
            { label: 'A Pagar (30d)', value: stats.a_pagar_30d, icon: ArrowUpRight, color: 'hsl(var(--destructive))', desc: 'Compromissos previstos' },
            { label: 'Inadimplência', value: stats.vencidos_total, icon: AlertTriangle, color: 'hsl(var(--warning))', desc: 'Vencidos há +5 dias' },
          ].map((k, i) => (
            <div key={i} className="card glass" style={{ gridColumn: 'span 3', padding: '1.25rem', borderLeft: `4px solid ${k.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.05em' }}>{k.label}</span>
                <k.icon style={{ color: k.color, fontSize: '1.1rem' }} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: k.color }}>{fmt(k.value)}</div>
              <div style={{ fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.35rem' }}>{k.desc}</div>
            </div>
          ))}

          {/* Capital de Giro KPI */}
          <div className="card glass" style={{ gridColumn: 'span 4', padding: '1.25rem', borderBottom: `4px solid ${(stats.capital_de_giro || 0) >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>CAPITAL DE GIRO</span>
              <Activity style={{ color: (stats.capital_de_giro || 0) >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: (stats.capital_de_giro || 0) >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
              {fmt(stats.capital_de_giro || 0)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
              {(stats.capital_de_giro || 0) >= 0 ? '✅ Positivo — empresa solvente' : '⚠️ Negativo — risco de liquidez'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.1rem' }}>
              = A Receber ({fmt(stats.a_receber_30d || 0)}) − A Pagar ({fmt(stats.a_pagar_30d || 0)})
            </div>
          </div>

          {/* Fluxo Projetado */}
          <div className="card glass" style={{ gridColumn: 'span 4', padding: '1.25rem', borderLeft: '4px solid hsl(var(--primary))' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}>PROJEÇÃO SALDO (FIM DO MÊS)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: (stats.saldo_total + (stats.a_receber_30d || 0) - (stats.a_pagar_30d || 0)) >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
              {fmt(stats.saldo_total + (stats.a_receber_30d || 0) - (stats.a_pagar_30d || 0))}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
              Baseado no saldo atual + títulos vincendos em 30 dias.
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.78rem' }}>
              <span style={{ color: 'hsl(var(--success))' }}>Est: + {fmt(stats.a_receber_30d || 0)}</span>
              <span style={{ color: 'hsl(var(--destructive))' }}>Est: - {fmt(stats.a_pagar_30d || 0)}</span>
            </div>
          </div>

          {/* Saldo por Conta */}
          <div className="card glass" style={{ gridColumn: 'span 4', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>SALDOS POR CONTA</div>
            {(stats.contas || []).slice(0, 4).map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid hsl(var(--border))', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.saldo_atual >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }} />
                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>{c.nome.toUpperCase()}</span>
                </div>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: Number(c.saldo_atual) >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                  {fmt(Number(c.saldo_atual))}
                </span>
              </div>
            ))}
          </div>

          {/* Evolução Capital de Giro */}
          <div className="card glass" style={{ gridColumn: 'span 8', padding: '1.5rem', height: '320px' }}>
            <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem' }}>EVOLUÇÃO DO CAPITAL DE GIRO (6 MESES)</div>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={capitalGiroHistorico}>
                <defs>
                  <linearGradient id="cgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(v: any) => [fmt(v), 'Capital de Giro']} />
                <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="capital" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#cgGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Composição de Despesas */}
          <div className="card glass" style={{ gridColumn: 'span 4', padding: '1.5rem', height: '320px' }}>
            <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem' }}>COMPOSIÇÃO DE GASTOS (Mês)</div>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie data={stats.despesas_por_classe || []} innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="total" nameKey="classe">
                  {(stats.despesas_por_classe || []).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: any) => [fmt(v), 'Valor']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top 5 Inadimplentes */}
          <div className="card glass" style={{ gridColumn: 'span 6', padding: '1.5rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--destructive))' }}>
              <AlertTriangle /> TOP 5 INADIMPLENTES
            </div>
            {(stats.top5_inadimplentes || []).length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem', color: 'hsl(var(--success))' }}>
                <CheckCircle style={{ fontSize: '1.5rem' }} />
                <span>Nenhuma inadimplência registrada!</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(stats.top5_inadimplentes || []).map((cli: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'hsl(var(--destructive)/0.06)', borderRadius: '8px', border: '1px solid hsl(var(--destructive)/0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'hsl(var(--destructive)/0.08)', color: 'hsl(var(--destructive))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{cli.cliente_nome || `Cliente #${cli.cliente_id}`}</div>
                        <div style={{ fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))' }}>
                          {cli.qtd_titulos} título{cli.qtd_titulos > 1 ? 's' : ''} • Vencido há {cli.dias_atraso} dia{cli.dias_atraso !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, color: 'hsl(var(--destructive))', fontFamily: 'monospace' }}>{fmt(cli.total_vencido)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximos Vencimentos */}
          <div className="card glass" style={{ gridColumn: 'span 6', padding: '1.5rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📅 VENCIMENTOS DOS PRÓXIMOS 7 DIAS</span>
            </div>
            {(stats.proximos_vencimentos || []).length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem', color: 'hsl(var(--success))' }}>
                <CheckCircle style={{ fontSize: '1.5rem' }} />
                <span>Nenhum vencimento nos próximos 7 dias!</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {(stats.proximos_vencimentos || []).map((v: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid hsl(var(--border))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                        background: v.tipo === 'pagar' ? 'hsl(var(--destructive))' : 'hsl(var(--success))' 
                      }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.83rem' }}>{v.numero_titulo}</div>
                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                          {v.tipo.toUpperCase()} • {new Date(v.data_vencimento).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: v.tipo === 'pagar' ? 'hsl(var(--destructive))' : 'hsl(var(--success))', fontFamily: 'monospace', fontSize: '0.88rem' }}>
                      {v.tipo === 'pagar' ? '-' : '+'} {fmt(v.valor)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link to="/financeiro/fluxo-caixa" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', fontSize: '0.8rem' }}>
              VER FLUXO COMPLETO <ArrowUpRight />
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}
