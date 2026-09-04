import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Grid, List, ArrowRight, Info, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { CardSkeleton } from '../components/common/Skeleton';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import { Button, Card, CardHeader, CardTitle } from '../components/ui';
import { CardBody as CardContent } from '../components/ui';
import { formatCurrency } from '../utils/calculations';
const fmt = formatCurrency;

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFluxo = async (gran: Granularity, reg: Regime) => {
    setLoading(true);
    try {
      const res = await api.financeiro.fluxoCaixa.get({ granularity: gran, regime: reg });
      setPeriodos(res?.periodos || []);
      setSaldoAtual(res?.saldo_atual || 0);
      if (res?.periodos?.length > 0) {
        setSelectedPeriod(res.periodos[0]);
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

  const chartData = periodos.map((p) => ({
    name: p.label,
    Receitas: p.receitas,
    Despesas: p.despesas,
    Saldo: p.saldo_projetado,
  }));

  return (
    <div
      className="page-container anim-fade-in"
      style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}
    >
      <Button
        variant="ghost"
        onClick={() => (window.location.hash = '#/financeiro')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'hsl(var(--muted-foreground))',
          marginBottom: '1rem',
          padding: 0,
          height: 'auto',
          background: 'transparent',
        }}
      >
        <ArrowLeft size={16} /> Voltar ao Painel Financeiro
      </Button>
      {/* Header */}
      <header
        style={{
          marginBottom: '2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.25rem',
            }}
          >
            <div
              style={{
                padding: '0.6rem',
                borderRadius: '12px',
                background: 'hsl(var(--primary) / 0.08)',
                color: 'hsl(var(--primary))',
              }}
            >
              <TrendingUp size={24} />
            </div>
            <h1
              style={{ fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}
            >
              FLUXO DE CAIXA GERENCIAL
            </h1>
          </div>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.95rem', margin: 0 }}>
            Projeção estratégica de liquidez e saúde financeira
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Controles combinados */}
          <div
            className="card glass"
            style={{
              padding: '0.35rem',
              display: 'flex',
              gap: '0.35rem',
              borderRadius: '12px',
              background: 'hsl(var(--surface-elevated))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            {(['daily', 'weekly', 'monthly'] as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => applyFilter(g, regime)}
                style={{
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  background: granularity === g ? 'hsl(var(--primary))' : 'transparent',
                  color: granularity === g ? 'black' : 'hsl(var(--muted-foreground))',
                  transition: '0.2s',
                }}
              >
                {g === 'daily' ? 'DIA' : g === 'weekly' ? 'SEM' : 'MÊS'}
              </button>
            ))}
          </div>

          <div
            className="card glass"
            style={{
              padding: '0.35rem',
              display: 'flex',
              gap: '0.35rem',
              borderRadius: '12px',
              background: 'hsl(var(--surface-elevated))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            {(['caixa', 'competencia'] as Regime[]).map((r) => (
              <button
                key={r}
                onClick={() => applyFilter(granularity, r)}
                style={{
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  background: regime === r ? '#6366f1' : 'transparent',
                  color: regime === r ? 'white' : 'hsl(var(--muted-foreground))',
                  transition: '0.2s',
                }}
              >
                {r === 'caixa' ? 'CAIXA' : 'COMP.'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Top Indicators */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        {[
          {
            label: 'Saldo Atual em Conta',
            value: saldoAtual,
            color: 'hsl(var(--primary))',
            icon: Grid,
          },
          {
            label: 'Total Entradas',
            value: periodos.reduce((s, p) => s + p.receitas, 0),
            color: 'hsl(var(--success))',
            icon: ArrowRight,
          },
          {
            label: 'Total Saídas',
            value: periodos.reduce((s, p) => s + p.despesas, 0),
            color: 'hsl(var(--destructive))',
            icon: ArrowRight,
          },
          {
            label: 'Ponto de Equilíbrio (Final)',
            value: periodos[periodos.length - 1]?.saldo_projetado || saldoAtual,
            color: 'hsl(var(--accent))',
            icon: TrendingUp,
          },
        ].map((k, i) => (
          <Card key={i} style={{ position: 'relative', overflow: 'hidden' }}>
            <CardContent style={{ padding: '1.5rem' }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'hsl(var(--muted-foreground))',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                  letterSpacing: '0.05em',
                }}
              >
                {k.label}
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: k.color }}>
                {fmt(k.value)}
              </div>
              <k.icon
                style={{
                  position: 'absolute',
                  right: '-10px',
                  bottom: '-10px',
                  fontSize: '4rem',
                  opacity: 0.05,
                  transform: 'rotate(-15deg)',
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', alignItems: 'start' }}
        className="md:grid-cols-[1fr_380px]"
      >
        <style>{`
          @media (min-width: 768px) {
            .md\\:grid-cols-\\[1fr_380px\\] {
              grid-template-columns: 1fr 380px;
            }
          }
        `}</style>

        {/* Main View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Chart Section */}
          {viewMode === 'chart' ? (
            <Card>
              <CardHeader
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <CardTitle style={{ fontSize: '1rem', fontWeight: 800 }}>
                  PROJEÇÃO DE DISPONIBILIDADE
                </CardTitle>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    onClick={() => setViewMode('chart')}
                    variant={viewMode === 'chart' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    <Grid size={16} />
                  </Button>
                  <Button
                    onClick={() => setViewMode('table')}
                    variant={viewMode === 'table' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    <List size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent style={{ height: '350px', padding: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
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
                      tickFormatter={(v) =>
                        `R$${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--surface))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      }}
                      formatter={(v: any) => [fmt(v), 'Saldo Projetado']}
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="Saldo"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorSaldo)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            /* Table Section */
            <Card style={{ overflow: 'hidden' }}>
              <CardHeader
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <CardTitle style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                  DETALHAMENTO TEMPORAL
                </CardTitle>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                  * Clique na linha para selecionar o período
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    onClick={() => setViewMode('chart')}
                    variant={viewMode === 'chart' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    <Grid size={16} />
                  </Button>
                  <Button
                    onClick={() => setViewMode('table')}
                    variant={viewMode === 'table' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    <List size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent style={{ padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'hsl(var(--surface))' }}>
                      <th
                        style={{
                          padding: '1rem',
                          textAlign: 'left',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: 'hsl(var(--muted-foreground))',
                          textTransform: 'uppercase',
                        }}
                      >
                        Período
                      </th>
                      <th
                        style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: 'hsl(var(--muted-foreground))',
                          textTransform: 'uppercase',
                        }}
                      >
                        Saldo Ant.
                      </th>
                      <th
                        style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: 'hsl(var(--muted-foreground))',
                          textTransform: 'uppercase',
                        }}
                      >
                        Receitas
                      </th>
                      <th
                        style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: 'hsl(var(--muted-foreground))',
                          textTransform: 'uppercase',
                        }}
                      >
                        Despesas
                      </th>
                      <th
                        style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: 'hsl(var(--muted-foreground))',
                          textTransform: 'uppercase',
                        }}
                      >
                        Saldo Proj.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodos.map((p, i) => {
                      const isSelected = selectedPeriod?.label === p.label;
                      return (
                        <tr
                          key={i}
                          onClick={() => setSelectedPeriod(p)}
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                            borderLeft: isSelected
                              ? '4px solid hsl(var(--primary))'
                              : '4px solid transparent',
                            borderBottom: '1px solid hsl(var(--surface-hover))',
                          }}
                        >
                          <td
                            style={{
                              padding: '1.25rem 1rem',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                            }}
                          >
                            {p.label}
                          </td>
                          <td
                            style={{
                              padding: '1.25rem 1rem',
                              textAlign: 'right',
                              fontSize: '0.85rem',
                              color: 'hsl(var(--muted-foreground))',
                              fontFamily: 'monospace',
                            }}
                          >
                            {fmt(p.saldo_anterior)}
                          </td>
                          <td
                            style={{
                              padding: '1.25rem 1rem',
                              textAlign: 'right',
                              fontSize: '0.85rem',
                              color: 'hsl(var(--success))',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                            }}
                          >
                            +{fmt(p.receitas)}
                          </td>
                          <td
                            style={{
                              padding: '1.25rem 1rem',
                              textAlign: 'right',
                              fontSize: '0.85rem',
                              color: 'hsl(var(--destructive))',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                            }}
                          >
                            -{fmt(p.despesas)}
                          </td>
                          <td
                            style={{
                              padding: '1.25rem 1rem',
                              textAlign: 'right',
                              fontSize: '0.95rem',
                              fontWeight: 900,
                              color:
                                p.saldo_projetado >= 0
                                  ? 'hsl(var(--success))'
                                  : 'hsl(var(--destructive))',
                              fontFamily: 'monospace',
                            }}
                          >
                            {fmt(p.saldo_projetado)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Details */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <CardHeader
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}
            >
              <Calendar color="hsl(var(--primary))" size={20} />
              <CardTitle style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                DETALHES DO PERÍODODO
              </CardTitle>
            </CardHeader>

            <CardContent style={{ padding: '1.25rem' }}>
              {loading ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : !selectedPeriod ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: 'hsl(var(--muted-foreground))',
                  }}
                >
                  <Info size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.85rem' }}>
                    Selecione um período no grid para ver os títulos individuais
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        color: 'hsl(var(--primary))',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {selectedPeriod.label}
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: 'hsl(var(--muted-foreground))',
                        marginBottom: '1rem',
                      }}
                    >
                      {new Date(selectedPeriod.inicio).toLocaleDateString()} até{' '}
                      {new Date(selectedPeriod.fim).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Receitas */}
                  <div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        color: 'hsl(var(--success))',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>Entradas Previstas</span>
                      <span>{fmt(selectedPeriod.receitas)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedPeriod.titulos_receber.length === 0 ? (
                        <div
                          style={{
                            padding: '1rem',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: 'hsl(var(--muted-foreground))',
                            background: 'hsl(var(--surface))',
                            borderRadius: '8px',
                          }}
                        >
                          Nenhuma entrada.
                        </div>
                      ) : (
                        selectedPeriod.titulos_receber.map((t: any, i: number) => (
                          <div
                            key={i}
                            style={{
                              background: 'hsl(var(--surface))',
                              padding: '0.6rem',
                              borderRadius: '8px',
                              border: '1px solid hsl(var(--border))',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.2rem',
                              }}
                            >
                              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                                {t.numero}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 900,
                                  color: 'hsl(var(--success))',
                                }}
                              >
                                {fmt(t.valor)}
                              </span>
                            </div>
                            {t.cliente && (
                              <div
                                style={{
                                  fontSize: '0.65rem',
                                  color: 'hsl(var(--muted-foreground))',
                                }}
                              >
                                {t.cliente}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Despesas */}
                  <div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        color: 'hsl(var(--destructive))',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>Saídas Previstas</span>
                      <span>{fmt(selectedPeriod.despesas)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedPeriod.titulos_pagar.length === 0 ? (
                        <div
                          style={{
                            padding: '1rem',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: 'hsl(var(--muted-foreground))',
                            background: 'hsl(var(--surface))',
                            borderRadius: '8px',
                          }}
                        >
                          Nenhuma saída.
                        </div>
                      ) : (
                        selectedPeriod.titulos_pagar.map((t: any, i: number) => (
                          <div
                            key={i}
                            style={{
                              background: 'hsl(var(--surface))',
                              padding: '0.6rem',
                              borderRadius: '8px',
                              border: '1px solid hsl(var(--border))',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.2rem',
                              }}
                            >
                              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                                {t.numero}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 900,
                                  color: 'hsl(var(--destructive))',
                                }}
                              >
                                {fmt(t.valor)}
                              </span>
                            </div>
                            {t.fornecedor && (
                              <div
                                style={{
                                  fontSize: '0.65rem',
                                  color: 'hsl(var(--muted-foreground))',
                                }}
                              >
                                {t.fornecedor}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            style={{
              background: 'hsl(var(--primary) / 0.02)',
              border: '1px dashed hsl(var(--primary) / 0.19)',
            }}
          >
            <CardContent style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                DISPONIBILIDADE FINAL
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'hsl(var(--primary))' }}>
                {fmt(selectedPeriod?.saldo_projetado || saldoAtual)}
              </div>
              <p
                style={{
                  fontSize: '0.65rem',
                  color: 'hsl(var(--muted-foreground))',
                  marginTop: '0.5rem',
                  margin: 0,
                }}
              >
                Este valor representa o saldo final projetado após todas as movimentações previstas
                até o fim deste período.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
