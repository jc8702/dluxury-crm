import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Grid, List, ArrowRight, Info } from 'lucide-react';
import { api } from '../lib/api';
import { CardSkeleton } from '../design-system/components/Skeleton';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

interface Periodo {
  label: string;
  inicio: string;
  fim: string;
  saldo_anterior: number;
  receitas: number;
  despesas: number;
  saldo_projetado: number;
  titulos_receber: { numero: string; valor: number; cliente?: string }[];
  titulos_pagar: { numero: string; valor: number; fornecedor?: string }[];
}

type Granularity = 'daily' | 'weekly' | 'monthly';
type Regime = 'caixa' | 'competencia';

export default function FinanceiroFluxoCaixaPage() {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [saldoAtual, setSaldoAtual] = useState(0);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<Granularity>('weekly');
  const [regime, setRegime] = useState<Regime>('caixa');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [selectedPeriod, setSelectedPeriod] = useState<Periodo | null>(null);

  useEffect(() => {
    loadFluxo(granularity, regime);
  }, []);

  const loadFluxo = async (gran: Granularity, reg: Regime) => {
    setLoading(true);
    try {
      const res = await api.get(`/financeiro/fluxo-caixa?granularity=${gran}&regime=${reg}`);
      if (res.data.success) {
        setPeriodos(res.data.data.periodos || []);
        setSaldoAtual(res.data.data.saldo_atual || 0);
        if (res.data.data.periodos?.length > 0) {
           setSelectedPeriod(res.data.data.periodos[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (gran: Granularity, reg: Regime) => {
    setGranularity(gran);
    setRegime(reg);
    loadFluxo(gran, reg);
  };

  const chartData = periodos.map(p => ({
    name: p.label,
    Receitas: p.receitas,
    Despesas: p.despesas,
    Saldo: p.saldo_projetado,
  }));

  return (
    <div className="page-container anim-fade-in" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
             <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'hsl(var(--primary)/0.08)', color: 'hsl(var(--primary))' }}>
                <TrendingUp size={24} />
             </div>
             <h1 style={{ fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.02em' }}>FLUXO DE CAIXA GERENCIAL</h1>
          </div>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.95rem' }}>ProjeÃ§Ã£o estratÃ©gica de liquidez e saÃºde financeira</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
           {/* Controles combinados */}
           <div className="card glass" style={{ padding: '0.35rem', display: 'flex', gap: '0.35rem', borderRadius: '12px' }}>
              {(['daily', 'weekly', 'monthly'] as Granularity[]).map(g => (
                <button key={g} onClick={() => applyFilter(g, regime)} style={{
                  padding: '0.5rem 0.85rem', fontSize: '0.7rem', fontWeight: 800, border: 'none', cursor: 'pointer',
                  borderRadius: '8px',
                  background: granularity === g ? 'hsl(var(--primary))' : 'transparent',
                  color: granularity === g ? 'white' : 'hsl(var(--muted-foreground))',
                  transition: '0.2s'
                }}>
                  {g === 'daily' ? 'DIA' : g === 'weekly' ? 'SEM' : 'MÃŠS'}
                </button>
              ))}
           </div>

           <div className="card glass" style={{ padding: '0.35rem', display: 'flex', gap: '0.35rem', borderRadius: '12px' }}>
              {(['caixa', 'competencia'] as Regime[]).map(r => (
                <button key={r} onClick={() => applyFilter(granularity, r)} style={{
                  padding: '0.5rem 0.85rem', fontSize: '0.7rem', fontWeight: 800, border: 'none', cursor: 'pointer',
                  borderRadius: '8px',
                  background: regime === r ? '#6366f1' : 'transparent',
                  color: regime === r ? 'white' : 'hsl(var(--muted-foreground))',
                  transition: '0.2s'
                }}>
                  {r === 'caixa' ? 'CAIXA' : 'COMP.'}
                </button>
              ))}
           </div>
        </div>
      </header>

      {/* Top Indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Saldo Atual em Conta', value: saldoAtual, color: 'hsl(var(--primary))', icon: Grid },
          { label: 'Total Entradas', value: periodos.reduce((s, p) => s + p.receitas, 0), color: 'hsl(var(--success))', icon: ArrowRight },
          { label: 'Total SaÃ­das', value: periodos.reduce((s, p) => s + p.despesas, 0), color: 'hsl(var(--destructive))', icon: ArrowRight },
          { label: 'Ponto de EquilÃ­brio (Final)', value: periodos[periodos.length - 1]?.saldo_projetado || saldoAtual, color: 'hsl(var(--accent))', icon: TrendingUp },
        ].map((k, i) => (
          <div key={i} className="card glass" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>{k.label}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: k.color }}>{fmt(k.value)}</div>
            <k.icon style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '4rem', opacity: 0.05, transform: 'rotate(-15deg)' }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Main View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Chart Section */}
          <div className="card glass" style={{ padding: '1.5rem', height: '450px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>PROJEÃ‡ÃƒO DE DISPONIBILIDADE</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                   <button onClick={() => setViewMode('chart')} className={`btn ${viewMode === 'chart' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.4rem 0.6rem' }}><Grid /></button>
                   <button onClick={() => setViewMode('table')} className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.4rem 0.6rem' }}><List /></button>
                </div>
             </div>

             <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `R$${Math.abs(v) >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(v: any) => [fmt(v), 'Saldo Projetado']}
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="Saldo" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Table Section */}
          <div className="card glass" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>DETALHAMENTO TEMPORAL</h3>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>* Clique na linha para selecionar o perÃ­odo</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'hsl(var(--surface))' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>PerÃ­odo</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Saldo Ant.</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Receitas</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Despesas</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Saldo Proj.</th>
                  </tr>
                </thead>
                <tbody>
                  {periodos.map((p, i) => {
                    const isSelected = selectedPeriod?.label === p.label;
                    return (
                      <tr 
                        key={i} 
                        onClick={() => setSelectedPeriod(p)}
                        className={isSelected ? 'selected-row' : ''}
                        style={{ 
                          cursor: 'pointer', 
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                          borderLeft: isSelected ? '4px solid hsl(var(--primary))' : '4px solid transparent',
                          borderBottom: '1px solid hsl(var(--surface-hover))'
                        }}
                      >
                        <td style={{ padding: '1.25rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>{p.label}</td>
                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', fontFamily: 'monospace' }}>{fmt(p.saldo_anterior)}</td>
                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: 'hsl(var(--success))', fontWeight: 700, fontFamily: 'monospace' }}>+{fmt(p.receitas)}</td>
                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: 'hsl(var(--destructive))', fontWeight: 700, fontFamily: 'monospace' }}>-{fmt(p.despesas)}</td>
                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontSize: '0.95rem', fontWeight: 900, color: p.saldo_projetado >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))', fontFamily: 'monospace' }}>
                           {fmt(p.saldo_projetado)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Details */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div className="card glass" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                 <Calendar color="hsl(var(--primary))" />
                 <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>DETALHES DO PERÃ ODO</h3>
              </div>

              {loading ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                   <CardSkeleton />
                   <CardSkeleton />
                </div>
              ) : !selectedPeriod ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>
                   <Info size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                   <p style={{ fontSize: '0.85rem' }}>Selecione um perÃ­odo no grid para ver os tÃ­tulos individuais</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                   <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'hsl(var(--primary))', marginBottom: '0.25rem' }}>{selectedPeriod.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>{new Date(selectedPeriod.inicio).toLocaleDateString()} atÃ© {new Date(selectedPeriod.fim).toLocaleDateString()}</div>
                   </div>

                   {/* Receitas */}
                   <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'hsl(var(--success))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Entradas Previstas</span>
                        <span>{fmt(selectedPeriod.receitas)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedPeriod.titulos_receber.length === 0 ? (
                          <tr><td colSpan={3} style={{ padding: 0 }}><div className="empty-state" style={{ border: 'none', borderRadius: 0, padding: '2rem' }}>Nenhuma entrada.</div></td></tr>
                        ) : selectedPeriod.titulos_receber.map((t: any, i: number) => (
                          <div key={i} style={{ background: 'hsl(var(--surface))', padding: '0.6rem', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{t.numero}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'hsl(var(--success))' }}>{fmt(t.valor)}</span>
                             </div>
                             {t.cliente && <div style={{ fontSize: '0.65rem', color: 'hsl(var(--muted-foreground))' }}>{t.cliente}</div>}
                          </div>
                        ))}
                      </div>
                   </div>

                   {/* Despesas */}
                   <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'hsl(var(--destructive))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>SaÃ­das Previstas</span>
                        <span>{fmt(selectedPeriod.despesas)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedPeriod.titulos_pagar.length === 0 ? (
                          <tr><td colSpan={3} style={{ padding: 0 }}><div className="empty-state" style={{ border: 'none', borderRadius: 0, padding: '2rem' }}>Nenhuma saída.</div></td></tr>
                        ) : selectedPeriod.titulos_pagar.map((t: any, i: number) => (
                          <div key={i} style={{ background: 'hsl(var(--surface))', padding: '0.6rem', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{t.numero}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'hsl(var(--destructive))' }}>{fmt(t.valor)}</span>
                             </div>
                             {t.fornecedor && <div style={{ fontSize: '0.65rem', color: 'hsl(var(--muted-foreground))' }}>{t.fornecedor}</div>}
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              )}
           </div>

           <div className="card glass" style={{ padding: '1.25rem', background: 'hsl(var(--primary)/0.02)', border: '1px dashed hsl(var(--primary)/0.19)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>DISPONIBILIDADE FINAL</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'hsl(var(--primary))' }}>{fmt(selectedPeriod?.saldo_projetado || saldoAtual)}</div>
              <p style={{ fontSize: '0.65rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>Este valor representa o saldo final projetado apÃ³s todas as movimentaÃ§Ãµes previstas atÃ© o fim deste perÃ­odo.</p>
           </div>
        </aside>

      </div>

      <style>{`
        .glass { background: hsl(var(--surface-elevated)); backdrop-filter: blur(10px); border: 1px solid hsl(var(--border)); }
        .page-container { color: var(--text-primary); }
      `}</style>
    </div>
  );
}
