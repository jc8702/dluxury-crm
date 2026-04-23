import React, { useEffect, useState } from 'react';
import { FiTrendingUp, FiCalendar, FiGrid, FiList, FiRefreshCw } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

interface Periodo {
  label: string;
  inicio: string;
  fim: string;
  saldo_anterior: number;
  receitas: number;
  despesas: number;
  saldo_projetado: number;
  titulos_receber: { numero: string; valor: number }[];
  titulos_pagar: { numero: string; valor: number }[];
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
  const [drilldown, setDrilldown] = useState<Periodo | null>(null);

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
    Despesas: -p.despesas,
    Saldo: p.saldo_projetado,
  }));

  const getRowColor = (p: Periodo) => {
    if (p.saldo_projetado < 0) return 'rgba(239,68,68,0.08)';
    if (p.despesas > p.receitas) return 'rgba(245,158,11,0.06)';
    return 'transparent';
  };

  return (
    <div className="page-container anim-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FiTrendingUp style={{ color: 'var(--primary)' }} /> FLUXO DE CAIXA GERENCIAL
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Projeção temporal de entradas e saídas financeiras</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Granularidade */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            {(['daily', 'weekly', 'monthly'] as Granularity[]).map(g => (
              <button key={g} onClick={() => applyFilter(g, regime)} style={{
                padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: granularity === g ? 'var(--primary)' : 'transparent',
                color: granularity === g ? 'white' : 'var(--text-muted)',
                transition: '0.2s'
              }}>
                {g === 'daily' ? 'DIÁRIO' : g === 'weekly' ? 'SEMANAL' : 'MENSAL'}
              </button>
            ))}
          </div>

          {/* Regime */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            {(['caixa', 'competencia'] as Regime[]).map(r => (
              <button key={r} onClick={() => applyFilter(granularity, r)} style={{
                padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: regime === r ? '#6366f1' : 'transparent',
                color: regime === r ? 'white' : 'var(--text-muted)',
                transition: '0.2s'
              }}>
                {r === 'caixa' ? 'CAIXA' : 'COMPETÊNCIA'}
              </button>
            ))}
          </div>

          {/* View Mode */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <button onClick={() => setViewMode('chart')} style={{ padding: '0.5rem 0.75rem', border: 'none', cursor: 'pointer', background: viewMode === 'chart' ? 'var(--surface-hover)' : 'transparent', color: viewMode === 'chart' ? 'var(--primary)' : 'var(--text-muted)' }}>
              <FiGrid />
            </button>
            <button onClick={() => setViewMode('table')} style={{ padding: '0.5rem 0.75rem', border: 'none', cursor: 'pointer', background: viewMode === 'table' ? 'var(--surface-hover)' : 'transparent', color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-muted)' }}>
              <FiList />
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Saldo Atual', value: saldoAtual, color: saldoAtual >= 0 ? 'var(--primary)' : 'var(--danger)' },
          { label: 'Total Receitas (Período)', value: periodos.reduce((s, p) => s + p.receitas, 0), color: 'var(--success)' },
          { label: 'Total Despesas (Período)', value: periodos.reduce((s, p) => s + p.despesas, 0), color: 'var(--danger)' },
          { label: 'Saldo Projetado Final', value: periodos[periodos.length - 1]?.saldo_projetado || saldoAtual, color: (periodos[periodos.length - 1]?.saldo_projetado || saldoAtual) >= 0 ? 'var(--success)' : 'var(--danger)' },
        ].map((k, i) => (
          <div key={i} className="card glass" style={{ padding: '1rem', borderLeft: `3px solid ${k.color}` }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>{k.label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: k.color }}>{fmt(k.value)}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Calculando projeção...</div>
      ) : (
        <>
          {viewMode === 'chart' && (
            <div className="card glass" style={{ padding: '1.5rem', height: '420px', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>RECEITAS × DESPESAS × SALDO PROJETADO</span>
                <button onClick={() => loadFluxo(granularity, regime)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <FiRefreshCw />
                </button>
              </div>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={v => `R$${Math.abs(v) >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    formatter={(v: any, n: string) => [fmt(Math.abs(v)), n]}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="var(--border)" strokeWidth={2} />
                  <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saldo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Grid Tabular */}
          <div className="card glass" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', fontWeight: 700, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span>GRID DE FLUXO POR PERÍODO</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>Clique em qualquer linha para ver detalhes dos títulos</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['PERÍODO', 'SALDO ANTERIOR', 'ENTRADAS', 'SAÍDAS', 'SALDO PROJETADO', 'VARIAÇÃO'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: h === 'PERÍODO' ? 'left' : 'right', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periodos.map((p, i) => {
                    const variacao = p.saldo_projetado - p.saldo_anterior;
                    return (
                      <tr key={i} onClick={() => setDrilldown(drilldown?.label === p.label ? null : p)} style={{ background: getRowColor(p), cursor: 'pointer', transition: '0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = getRowColor(p))}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}>{p.label}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.85rem', fontFamily: 'monospace' }}>{fmt(p.saldo_anterior)}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--success)', fontWeight: 700 }}>+ {fmt(p.receitas)}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--danger)', fontWeight: 700 }}>- {fmt(p.despesas)}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 900, color: p.saldo_projetado >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(p.saldo_projetado)}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.85rem', fontFamily: 'monospace', color: variacao >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {variacao >= 0 ? '+' : ''}{fmt(variacao)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drill-down */}
          {drilldown && (
            <div className="card glass" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiCalendar /> DETALHAMENTO DO PERÍODO: {drilldown.label}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--success)', marginBottom: '0.75rem' }}>
                    ENTRADAS ({drilldown.titulos_receber.length} título{drilldown.titulos_receber.length !== 1 ? 's' : ''})
                  </div>
                  {drilldown.titulos_receber.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma entrada neste período</div>
                  ) : drilldown.titulos_receber.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{t.numero}</span>
                      <span style={{ fontWeight: 700, color: 'var(--success)', fontFamily: 'monospace' }}>{fmt(t.valor)}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '0.75rem' }}>
                    SAÍDAS ({drilldown.titulos_pagar.length} título{drilldown.titulos_pagar.length !== 1 ? 's' : ''})
                  </div>
                  {drilldown.titulos_pagar.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma saída neste período</div>
                  ) : drilldown.titulos_pagar.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{t.numero}</span>
                      <span style={{ fontWeight: 700, color: 'var(--danger)', fontFamily: 'monospace' }}>{fmt(t.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
