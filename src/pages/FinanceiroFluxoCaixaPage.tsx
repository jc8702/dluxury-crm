import React, { useEffect, useState } from 'react';
import { FiTrendingUp, FiCalendar, FiGrid, FiList, FiRefreshCw, FiArrowRight, FiInfo } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, AreaChart, Area } from 'recharts';

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
      const qs = new URLSearchParams({ granularity: gran, regime: reg }).toString();
      const res = await fetch(`/api/financeiro/fluxo-caixa?${qs}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('dluxury_token') || ''}` }
      });
      const json = await res.json();
      if (json.success) {
        setPeriodos(json.data.periodos || []);
        setSaldoAtual(json.data.saldo_atual || 0);
        if (json.data.periodos?.length > 0) {
           setSelectedPeriod(json.data.periodos[0]);
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
             <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'var(--primary)15', color: 'var(--primary)' }}>
                <FiTrendingUp size={24} />
             </div>
             <h1 style={{ fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.02em' }}>FLUXO DE CAIXA GERENCIAL</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Projeção estratégica de liquidez e saúde financeira</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
           {/* Controles combinados */}
           <div className="card glass" style={{ padding: '0.35rem', display: 'flex', gap: '0.35rem', borderRadius: '12px' }}>
              {(['daily', 'weekly', 'monthly'] as Granularity[]).map(g => (
                <button key={g} onClick={() => applyFilter(g, regime)} style={{
                  padding: '0.5rem 0.85rem', fontSize: '0.7rem', fontWeight: 800, border: 'none', cursor: 'pointer',
                  borderRadius: '8px',
                  background: granularity === g ? 'var(--primary)' : 'transparent',
                  color: granularity === g ? 'white' : 'var(--text-muted)',
                  transition: '0.2s'
                }}>
                  {g === 'daily' ? 'DIA' : g === 'weekly' ? 'SEM' : 'MÊS'}
                </button>
              ))}
           </div>

           <div className="card glass" style={{ padding: '0.35rem', display: 'flex', gap: '0.35rem', borderRadius: '12px' }}>
              {(['caixa', 'competencia'] as Regime[]).map(r => (
                <button key={r} onClick={() => applyFilter(granularity, r)} style={{
                  padding: '0.5rem 0.85rem', fontSize: '0.7rem', fontWeight: 800, border: 'none', cursor: 'pointer',
                  borderRadius: '8px',
                  background: regime === r ? '#6366f1' : 'transparent',
                  color: regime === r ? 'white' : 'var(--text-muted)',
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
          { label: 'Saldo Atual em Conta', value: saldoAtual, color: 'var(--primary)', icon: FiGrid },
          { label: 'Total Entradas', value: periodos.reduce((s, p) => s + p.receitas, 0), color: 'var(--success)', icon: FiArrowRight },
          { label: 'Total Saídas', value: periodos.reduce((s, p) => s + p.despesas, 0), color: 'var(--danger)', icon: FiArrowRight },
          { label: 'Ponto de Equilíbrio (Final)', value: periodos[periodos.length - 1]?.saldo_projetado || saldoAtual, color: '#a855f7', icon: FiTrendingUp },
        ].map((k, i) => (
          <div key={i} className="card glass" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>{k.label}</div>
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
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>PROJEÇÃO DE DISPONIBILIDADE</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                   <button onClick={() => setViewMode('chart')} className={`btn ${viewMode === 'chart' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.4rem 0.6rem' }}><FiGrid /></button>
                   <button onClick={() => setViewMode('table')} className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.4rem 0.6rem' }}><FiList /></button>
                </div>
             </div>

             <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `R$${Math.abs(v) >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(v: any) => [fmt(v), 'Saldo Projetado']}
                    />
                    <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="Saldo" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Table Section */}
          <div className="card glass" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>DETALHAMENTO TEMPORAL</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>* Clique na linha para selecionar o período</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Período</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saldo Ant.</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Receitas</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Despesas</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saldo Proj.</th>
                  </tr>
                </thead>
                <tbody>
                  {periodos.map((p, i) => (
                    <tr 
                      key={i} 
                      onClick={() => setSelectedPeriod(p)}
                      style={{ 
                        cursor: 'pointer', 
                        transition: '0.2s',
                        background: selectedPeriod?.label === p.label ? 'var(--primary)08' : 'transparent',
                        borderLeft: selectedPeriod?.label === p.label ? '4px solid var(--primary)' : '4px solid transparent'
                      }}
                      onMouseEnter={e => !selectedPeriod?.label && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => !selectedPeriod?.label && (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>{p.label}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{fmt(p.saldo_anterior)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--success)', fontWeight: 700, fontFamily: 'monospace' }}>+{fmt(p.receitas)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 700, fontFamily: 'monospace' }}>-{fmt(p.despesas)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: 900, color: p.saldo_projetado >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'monospace' }}>
                         {fmt(p.saldo_projetado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Details */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div className="card glass" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                 <FiCalendar color="var(--primary)" />
                 <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>DETALHES DO PERÍODO</h3>
              </div>

              {!selectedPeriod ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                   <FiInfo size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                   <p style={{ fontSize: '0.85rem' }}>Selecione um período no grid para ver os títulos individuais</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                   <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: p.label === selectedPeriod.label ? 'var(--primary)' : 'inherit', marginBottom: '0.25rem' }}>{selectedPeriod.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{new Date(selectedPeriod.inicio).toLocaleDateString()} até {new Date(selectedPeriod.fim).toLocaleDateString()}</div>
                   </div>

                   {/* Receitas */}
                   <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Entradas Previstas</span>
                        <span>{fmt(selectedPeriod.receitas)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedPeriod.titulos_receber.length === 0 ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma entrada</span>
                        ) : selectedPeriod.titulos_receber.map((t, i) => (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{t.numero}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--success)' }}>{fmt(t.valor)}</span>
                             </div>
                             {t.cliente && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t.cliente}</div>}
                          </div>
                        ))}
                      </div>
                   </div>

                   {/* Despesas */}
                   <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Saídas Previstas</span>
                        <span>{fmt(selectedPeriod.despesas)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedPeriod.titulos_pagar.length === 0 ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma saída</span>
                        ) : selectedPeriod.titulos_pagar.map((t, i) => (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{t.numero}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--danger)' }}>{fmt(t.valor)}</span>
                             </div>
                             {t.fornecedor && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t.fornecedor}</div>}
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              )}
           </div>

           <div className="card glass" style={{ padding: '1.25rem', background: 'var(--primary)05', border: '1px dashed var(--primary)30' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>DISPONIBILIDADE FINAL</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)' }}>{fmt(selectedPeriod?.saldo_projetado || saldoAtual)}</div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Este valor representa o saldo final projetado após todas as movimentações previstas até o fim deste período.</p>
           </div>
        </aside>

      </div>

      <style>{`
        .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid var(--border); }
        .page-container { color: var(--text-primary); }
      `}</style>
    </div>
  );
}
