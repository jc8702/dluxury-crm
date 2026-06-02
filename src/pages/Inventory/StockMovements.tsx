import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Filter,
  ArrowDownCircle,
  ArrowUpCircle,
  Settings2,
  FileDown,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  History,
  Calendar,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { designSystem } from '@/styles/design-system';
import { Button, Card, CardContent } from '../../components/common';
import { useInventoryStore as useInventory } from '../../stores/useInventoryStore';
import { useToast } from '../../context/ToastContext';

type MovementType = 'entrada' | 'saida' | 'ajuste';

const TYPE_META: Record<
  MovementType,
  {
    label: string;
    bg: string;
    fg: string;
    border: string;
    icon: React.ReactNode;
    sign: '+' | '-' | '=';
  }
> = {
  entrada: {
    label: 'ENTRADA',
    bg: '#E6F4EA',
    fg: '#1E7E34',
    border: '#A8D5B6',
    icon: <ArrowDownCircle size={12} />,
    sign: '+',
  },
  saida: {
    label: 'SAÍDA',
    bg: '#FBE9EB',
    fg: '#B02A37',
    border: '#F0A8AE',
    icon: <ArrowUpCircle size={12} />,
    sign: '-',
  },
  ajuste: {
    label: 'AJUSTE',
    bg: '#FFF4E0',
    fg: '#8A5A00',
    border: '#F0CB7A',
    icon: <Settings2 size={12} />,
    sign: '=',
  },
};

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR');
};

const formatCurrency = (v?: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

type SortKey = 'data' | 'tipo' | 'quantidade' | 'material' | 'usuario';
type SortDir = 'asc' | 'desc';

export interface StockMovementsProps {
  onBack?: () => void;
  onNewEntry?: () => void;
  onNewExit?: () => void;
}

export const StockMovements: React.FC<StockMovementsProps> = ({
  onBack,
  onNewEntry,
  onNewExit,
}) => {
  const { movimentacoes, materiais, reloadInventoryData } = useInventory();
  const { error: toastError } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | MovementType>('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('data');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 12;

  useEffect(() => {
    setLoading(true);
    reloadInventoryData()
      .catch((err) => toastError('Erro ao carregar movimentações', err?.message || String(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userOptions = useMemo(() => {
    const set = new Set<string>();
    movimentacoes.forEach((m) => {
      if (m.criado_por) set.add(m.criado_por);
    });
    return Array.from(set).sort();
  }, [movimentacoes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return movimentacoes.filter((m) => {
      if (typeFilter !== 'all' && m.tipo !== typeFilter) return false;
      if (userFilter !== 'all' && m.criado_por !== userFilter) return false;
      if (dateFrom) {
        const d = new Date(m.created_at || 0);
        const from = new Date(dateFrom);
        if (d < from) return false;
      }
      if (dateTo) {
        const d = new Date(m.created_at || 0);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      if (term) {
        const t = term;
        const matchMat = (m.material_nome || '').toLowerCase().includes(t);
        const matchSku = (m.material_sku || '').toLowerCase().includes(t);
        const matchMot = (m.motivo || '').toLowerCase().includes(t);
        if (!matchMat && !matchSku && !matchMot) return false;
      }
      return true;
    });
  }, [movimentacoes, search, typeFilter, userFilter, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      switch (sortKey) {
        case 'data':
          va = new Date(a.created_at || 0).getTime();
          vb = new Date(b.created_at || 0).getTime();
          break;
        case 'tipo':
          va = a.tipo;
          vb = b.tipo;
          break;
        case 'quantidade':
          va = a.quantidade;
          vb = b.quantidade;
          break;
        case 'material':
          va = (a.material_nome || '').toLowerCase();
          vb = (b.material_nome || '').toLowerCase();
          break;
        case 'usuario':
          va = (a.criado_por || '').toLowerCase();
          vb = (b.criado_por || '').toLowerCase();
          break;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const metrics = useMemo(() => {
    let entradas = 0,
      saidas = 0,
      ajustes = 0;
    let valorEntradas = 0,
      valorSaidas = 0;
    movimentacoes.forEach((m) => {
      if (m.tipo === 'entrada') {
        entradas += 1;
        valorEntradas += Number(m.valor_total || 0);
      } else if (m.tipo === 'saida') {
        saidas += 1;
        valorSaidas += Number(m.valor_total || 0);
      } else {
        ajustes += 1;
      }
    });
    return { entradas, saidas, ajustes, valorEntradas, valorSaidas, total: movimentacoes.length };
  }, [movimentacoes]);

  const chartData = useMemo(() => {
    const byDay = new Map<
      string,
      { dia: string; entrada: number; saida: number; liquido: number }
    >();
    movimentacoes.forEach((m) => {
      if (!m.created_at) return;
      const d = new Date(m.created_at);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      const day = byDay.get(key) || { dia: key, entrada: 0, saida: 0, liquido: 0 };
      const qty = Number(m.quantidade || 0);
      if (m.tipo === 'entrada') {
        day.entrada += qty;
        day.liquido += qty;
      } else if (m.tipo === 'saida') {
        day.saida += qty;
        day.liquido -= qty;
      }
      byDay.set(key, day);
    });
    return Array.from(byDay.values())
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .slice(-14)
      .map((d) => ({ ...d, dia: d.dia.slice(5) }));
  }, [movimentacoes]);

  const topMaterials = useMemo(() => {
    const byMat = new Map<string, { nome: string; sku: string; entrada: number; saida: number }>();
    movimentacoes.forEach((m) => {
      const key = m.material_id || m.material_nome || 'sem-material';
      const item = byMat.get(key) || {
        nome: m.material_nome || 'Sem nome',
        sku: m.material_sku || '',
        entrada: 0,
        saida: 0,
      };
      const qty = Number(m.quantidade || 0);
      if (m.tipo === 'entrada') item.entrada += qty;
      else if (m.tipo === 'saida') item.saida += qty;
      byMat.set(key, item);
    });
    return Array.from(byMat.values())
      .map((x) => ({ ...x, total: x.entrada + x.saida }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [movimentacoes]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setUserFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilter =
    !!search || typeFilter !== 'all' || userFilter !== 'all' || !!dateFrom || !!dateTo;

  const handleExport = () => {
    const rows = sorted.map((m) => ({
      Data: formatDateTime(m.created_at),
      Tipo: m.tipo,
      Material: m.material_nome || '',
      SKU: m.material_sku || '',
      Quantidade: Number(m.quantidade || 0),
      Unidade: m.material_unidade || '',
      'Estoque Antes': Number(m.estoque_antes || 0),
      'Estoque Depois': Number(m.estoque_depois || 0),
      Motivo: m.motivo || '',
      NF: m.nota_fiscal || '',
      Valor: Number(m.valor_total || 0),
      Usuário: m.criado_por || '',
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(';'),
      ...rows.map((r) =>
        headers.map((h) => `"${String((r as any)[h] ?? '').replace(/"/g, '""')}"`).join(';'),
      ),
    ].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movimentacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const SortHeader: React.FC<{
    k: SortKey;
    label: string;
    align?: 'left' | 'right' | 'center';
  }> = ({ k, label, align = 'left' }) => {
    const active = sortKey === k;
    return (
      <th
        role="columnheader"
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        onClick={() => toggleSort(k)}
        style={{
          padding: designSystem.spacing.md,
          fontSize: designSystem.typography.fontSizes.xs,
          fontWeight: designSystem.typography.fontWeights.semibold,
          color: active ? designSystem.colors.primary[600] : designSystem.colors.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          textAlign: align,
        }}
      >
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: designSystem.spacing.xs }}
        >
          {label}
          {active ? (
            sortDir === 'asc' ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )
          ) : (
            <span style={{ opacity: 0.3, display: 'inline-flex' }}>
              <ChevronUp size={12} />
            </span>
          )}
        </span>
      </th>
    );
  };

  return (
    <div
      className="ds-stock-movements"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: designSystem.spacing.xl,
        padding: designSystem.spacing.lg,
        fontFamily: designSystem.typography.fontFamily,
        color: designSystem.colors.text.primary,
      }}
    >
      <style>{`
        .ds-stock-movements input:focus, .ds-stock-movements select:focus {
          border-color: ${designSystem.colors.primary[500]} !important;
          box-shadow: 0 0 0 3px ${designSystem.colors.primary[100]};
        }
        .ds-stock-movements table tbody tr { transition: background-color 0.15s ease, box-shadow 0.15s ease; }
        .ds-stock-movements table tbody tr:hover { background: ${designSystem.colors.background}; box-shadow: ${designSystem.shadows.sm}; }
      `}</style>

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: designSystem.spacing.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: designSystem.spacing.md }}>
          <button
            type="button"
            onClick={() => (onBack ? onBack() : navigate(-1))}
            aria-label="Voltar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: designSystem.borderRadius.md,
              border: `1px solid ${designSystem.colors.border}`,
              background: designSystem.colors.surface,
              color: designSystem.colors.text.secondary,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1
              style={{
                fontSize: designSystem.typography.fontSizes['3xl'],
                fontWeight: designSystem.typography.fontWeights.bold,
                color: designSystem.colors.text.primary,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: designSystem.spacing.sm,
              }}
            >
              <History size={26} color={designSystem.colors.primary[600]} />
              Histórico de Movimentações
            </h1>
            <p
              style={{
                color: designSystem.colors.text.secondary,
                fontSize: designSystem.typography.fontSizes.sm,
                margin: `${designSystem.spacing.xs} 0 0 0`,
              }}
            >
              Entradas, saídas e ajustes de estoque com auditoria completa.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: designSystem.spacing.sm, flexWrap: 'wrap' }}>
          <Button onClick={() => reloadInventoryData()} style={secondaryBtnStyle}>
            <RefreshCw size={14} /> Atualizar
          </Button>
          <Button onClick={handleExport} style={secondaryBtnStyle}>
            <FileDown size={14} /> Exportar
          </Button>
          {onNewEntry && (
            <Button
              onClick={onNewEntry}
              style={{
                ...primaryBtnStyle,
                background: designSystem.colors.success,
                boxShadow: `0 4px 12px ${designSystem.colors.success}40`,
              }}
            >
              <ArrowDownCircle size={16} /> + Entrada
            </Button>
          )}
          {onNewExit && (
            <Button
              onClick={onNewExit}
              style={{
                ...primaryBtnStyle,
                background: designSystem.colors.error,
                boxShadow: `0 4px 12px ${designSystem.colors.error}40`,
              }}
            >
              <ArrowUpCircle size={16} /> - Saída
            </Button>
          )}
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: designSystem.spacing.md,
        }}
      >
        <MetricCard
          icon={<TrendingUp size={16} />}
          label="Entradas"
          accent={designSystem.colors.success}
          value={metrics.entradas}
          subtitle={formatCurrency(metrics.valorEntradas)}
        />
        <MetricCard
          icon={<TrendingDown size={16} />}
          label="Saídas"
          accent={designSystem.colors.error}
          value={metrics.saidas}
          subtitle={formatCurrency(metrics.valorSaidas)}
        />
        <MetricCard
          icon={<Settings2 size={16} />}
          label="Ajustes"
          accent={designSystem.colors.warning}
          value={metrics.ajustes}
        />
        <MetricCard
          icon={<History size={16} />}
          label="Total Movimentos"
          accent={designSystem.colors.primary[600]}
          value={metrics.total}
        />
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: designSystem.spacing.lg,
        }}
      >
        <Card>
          <CardContent style={{ padding: designSystem.spacing.lg }}>
            <h3
              style={{
                margin: `0 0 ${designSystem.spacing.md} 0`,
                fontSize: designSystem.typography.fontSizes.md,
                fontWeight: designSystem.typography.fontWeights.bold,
                color: designSystem.colors.text.primary,
              }}
            >
              Movimentação Diária (últimos 14 dias)
            </h3>
            {chartData.length === 0 ? (
              <div
                style={{
                  padding: designSystem.spacing.xl,
                  textAlign: 'center',
                  color: designSystem.colors.text.secondary,
                  fontSize: designSystem.typography.fontSizes.sm,
                }}
              >
                Sem dados de movimentação no período.
              </div>
            ) : (
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={designSystem.colors.border} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="dia"
                      tick={{ fontSize: 11, fill: designSystem.colors.text.secondary }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: designSystem.colors.text.secondary }} />
                    <Tooltip
                      contentStyle={{
                        background: designSystem.colors.surface,
                        border: `1px solid ${designSystem.colors.border}`,
                        borderRadius: designSystem.borderRadius.md,
                        fontSize: designSystem.typography.fontSizes.xs,
                        fontFamily: designSystem.typography.fontFamily,
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: designSystem.typography.fontSizes.xs,
                        fontFamily: designSystem.typography.fontFamily,
                      }}
                    />
                    <Bar
                      dataKey="entrada"
                      name="Entradas"
                      fill={designSystem.colors.success}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="saida"
                      name="Saídas"
                      fill={designSystem.colors.error}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: designSystem.spacing.lg }}>
            <h3
              style={{
                margin: `0 0 ${designSystem.spacing.md} 0`,
                fontSize: designSystem.typography.fontSizes.md,
                fontWeight: designSystem.typography.fontWeights.bold,
                color: designSystem.colors.text.primary,
              }}
            >
              Saldo Líquido (últimos 14 dias)
            </h3>
            {chartData.length === 0 ? (
              <div
                style={{
                  padding: designSystem.spacing.xl,
                  textAlign: 'center',
                  color: designSystem.colors.text.secondary,
                  fontSize: designSystem.typography.fontSizes.sm,
                }}
              >
                Sem dados para exibir.
              </div>
            ) : (
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={designSystem.colors.border} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="dia"
                      tick={{ fontSize: 11, fill: designSystem.colors.text.secondary }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: designSystem.colors.text.secondary }} />
                    <Tooltip
                      contentStyle={{
                        background: designSystem.colors.surface,
                        border: `1px solid ${designSystem.colors.border}`,
                        borderRadius: designSystem.borderRadius.md,
                        fontSize: designSystem.typography.fontSizes.xs,
                        fontFamily: designSystem.typography.fontFamily,
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: designSystem.typography.fontSizes.xs,
                        fontFamily: designSystem.typography.fontFamily,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="liquido"
                      name="Líquido"
                      stroke={designSystem.colors.primary[500]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {topMaterials.length > 0 && (
        <section
          style={{
            background: designSystem.colors.surface,
            borderRadius: designSystem.borderRadius.lg,
            boxShadow: designSystem.shadows.md,
            padding: designSystem.spacing.lg,
          }}
        >
          <h3
            style={{
              margin: `0 0 ${designSystem.spacing.md} 0`,
              fontSize: designSystem.typography.fontSizes.md,
              fontWeight: designSystem.typography.fontWeights.bold,
              color: designSystem.colors.text.primary,
            }}
          >
            Top materiais com mais movimento
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: designSystem.spacing.sm,
            }}
          >
            {topMaterials.map((m, idx) => (
              <div
                key={idx}
                style={{
                  background: designSystem.colors.background,
                  border: `1px solid ${designSystem.colors.border}`,
                  borderRadius: designSystem.borderRadius.md,
                  padding: designSystem.spacing.sm,
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: designSystem.colors.text.secondary,
                    fontWeight: designSystem.typography.fontWeights.semibold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  #{idx + 1} {m.sku}
                </div>
                <div
                  style={{
                    fontSize: designSystem.typography.fontSizes.sm,
                    fontWeight: designSystem.typography.fontWeights.bold,
                    color: designSystem.colors.text.primary,
                    marginBottom: 4,
                  }}
                >
                  {m.nome}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span
                    style={{
                      color: designSystem.colors.success,
                      fontWeight: designSystem.typography.fontWeights.semibold,
                    }}
                  >
                    +{m.entrada}
                  </span>
                  <span
                    style={{
                      color: designSystem.colors.error,
                      fontWeight: designSystem.typography.fontWeights.semibold,
                    }}
                  >
                    -{m.saida}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        style={{
          background: designSystem.colors.surface,
          borderRadius: designSystem.borderRadius.lg,
          boxShadow: designSystem.shadows.md,
          padding: designSystem.spacing.lg,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: designSystem.spacing.md,
            marginBottom: designSystem.spacing.lg,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: designSystem.spacing.xs,
              color: designSystem.colors.text.secondary,
              fontSize: designSystem.typography.fontSizes.sm,
              fontWeight: designSystem.typography.fontWeights.semibold,
            }}
          >
            <Filter size={14} /> Filtros
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: designSystem.spacing.md,
            marginBottom: designSystem.spacing.lg,
          }}
        >
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: designSystem.spacing.md,
                top: '50%',
                transform: 'translateY(-50%)',
                color: designSystem.colors.text.secondary,
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Buscar por material, SKU ou motivo…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Buscar movimentações"
              style={inputStyle}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as any);
              setPage(1);
            }}
            aria-label="Filtrar por tipo"
            style={inputStyle}
          >
            <option value="all">Todos os tipos</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="ajuste">Ajuste</option>
          </select>

          <select
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por usuário"
            style={inputStyle}
          >
            <option value="all">Todos os usuários</option>
            {userOptions.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: designSystem.spacing.xs }}>
            <Calendar size={14} color={designSystem.colors.text.secondary} />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              aria-label="Data inicial"
              style={{ ...inputStyle, paddingLeft: designSystem.spacing.md }}
            />
            <span
              style={{
                color: designSystem.colors.text.secondary,
                fontSize: designSystem.typography.fontSizes.xs,
              }}
            >
              até
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              aria-label="Data final"
              style={{ ...inputStyle, paddingLeft: designSystem.spacing.md }}
            />
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                background: 'transparent',
                color: designSystem.colors.error,
                border: `1px solid ${designSystem.colors.border}`,
                borderRadius: designSystem.borderRadius.md,
                padding: `${designSystem.spacing.sm} ${designSystem.spacing.md}`,
                fontSize: designSystem.typography.fontSizes.xs,
                fontWeight: designSystem.typography.fontWeights.semibold,
                cursor: 'pointer',
                fontFamily: designSystem.typography.fontFamily,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: designSystem.spacing.xs,
              }}
            >
              <X size={12} /> Limpar filtros
            </button>
          )}
        </div>

        <div
          style={{
            width: '100%',
            overflowX: 'auto',
            borderRadius: designSystem.borderRadius.md,
            border: `1px solid ${designSystem.colors.border}`,
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: designSystem.typography.fontSizes.sm,
            }}
            role="table"
            aria-label="Histórico de movimentações de estoque"
          >
            <thead>
              <tr
                style={{
                  background: designSystem.colors.background,
                  borderBottom: `2px solid ${designSystem.colors.border}`,
                }}
              >
                <SortHeader k="data" label="Data" />
                <SortHeader k="tipo" label="Tipo" />
                <SortHeader k="material" label="Material" />
                <SortHeader k="quantidade" label="Quantidade" align="right" />
                <th style={thStyle}>Motivo</th>
                <SortHeader k="usuario" label="Usuário" />
                <th style={thStyle}>Estoque (antes → depois)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: designSystem.spacing['2xl'],
                      textAlign: 'center',
                      color: designSystem.colors.text.secondary,
                    }}
                  >
                    Carregando movimentações…
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: designSystem.spacing['2xl'],
                      textAlign: 'center',
                      color: designSystem.colors.text.secondary,
                    }}
                  >
                    <History
                      size={32}
                      style={{ opacity: 0.3, margin: '0 auto', display: 'block' }}
                    />
                    <p style={{ margin: `${designSystem.spacing.sm} 0 0 0` }}>
                      {hasActiveFilter
                        ? 'Nenhuma movimentação encontrada com os filtros atuais.'
                        : 'Nenhuma movimentação registrada no sistema.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((m) => {
                  const meta = TYPE_META[m.tipo as MovementType] || TYPE_META.ajuste;
                  const mat = materiais.find((x) => x.id === m.material_id);
                  return (
                    <tr
                      key={m.id}
                      style={{ borderBottom: `1px solid ${designSystem.colors.border}` }}
                    >
                      <td
                        style={{
                          padding: designSystem.spacing.md,
                          color: designSystem.colors.text.secondary,
                          fontSize: designSystem.typography.fontSizes.xs,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDateTime(m.created_at)}
                      </td>
                      <td style={{ padding: designSystem.spacing.md }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: `${designSystem.spacing.xs} ${designSystem.spacing.sm}`,
                            borderRadius: designSystem.borderRadius.full,
                            fontSize: designSystem.typography.fontSizes.xs,
                            fontWeight: designSystem.typography.fontWeights.bold,
                            background: meta.bg,
                            color: meta.fg,
                            border: `1px solid ${meta.border}`,
                          }}
                        >
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: designSystem.spacing.md }}>
                        <div
                          style={{
                            fontWeight: designSystem.typography.fontWeights.semibold,
                            color: designSystem.colors.text.primary,
                          }}
                        >
                          {m.material_nome || mat?.nome || '—'}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: designSystem.colors.text.secondary,
                            fontFamily: 'monospace',
                            marginTop: 2,
                          }}
                        >
                          {m.material_sku || mat?.sku || ''}
                        </div>
                      </td>
                      <td style={{ padding: designSystem.spacing.md, textAlign: 'right' }}>
                        <div
                          style={{
                            fontWeight: designSystem.typography.fontWeights.bold,
                            color:
                              m.tipo === 'entrada'
                                ? designSystem.colors.success
                                : m.tipo === 'saida'
                                  ? designSystem.colors.error
                                  : designSystem.colors.text.primary,
                          }}
                        >
                          {meta.sign}
                          {Number(m.quantidade || 0).toLocaleString('pt-BR')}{' '}
                          {m.material_unidade || mat?.unidade_compra || ''}
                        </div>
                        {Number(m.valor_total || 0) > 0 && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: designSystem.colors.text.secondary,
                              marginTop: 2,
                            }}
                          >
                            {formatCurrency(m.valor_total)}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: designSystem.spacing.md,
                          color: designSystem.colors.text.secondary,
                          maxWidth: 240,
                        }}
                      >
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.motivo || '—'}
                        </div>
                        {m.nota_fiscal && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: designSystem.colors.primary[600],
                              fontWeight: designSystem.typography.fontWeights.semibold,
                              marginTop: 2,
                            }}
                          >
                            NF: {m.nota_fiscal}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: designSystem.spacing.md,
                          color: designSystem.colors.text.secondary,
                          fontSize: designSystem.typography.fontSizes.xs,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <User size={11} /> {m.criado_por || '—'}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: designSystem.spacing.md,
                          color: designSystem.colors.text.secondary,
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {Number(m.estoque_antes || 0).toLocaleString('pt-BR')} →{' '}
                        {Number(m.estoque_depois || 0).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: designSystem.spacing.xs,
              marginTop: designSystem.spacing.lg,
            }}
          >
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={paginationBtn(safePage === 1)}
            >
              ←
            </Button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((n) => (
              <Button
                key={n}
                onClick={() => setPage(n)}
                style={{
                  background:
                    n === safePage ? designSystem.colors.primary[500] : designSystem.colors.surface,
                  color:
                    n === safePage ? designSystem.colors.surface : designSystem.colors.text.primary,
                  border: `1px solid ${n === safePage ? designSystem.colors.primary[500] : designSystem.colors.border}`,
                  borderRadius: designSystem.borderRadius.md,
                  padding: `${designSystem.spacing.xs} ${designSystem.spacing.md}`,
                  fontSize: designSystem.typography.fontSizes.sm,
                  fontWeight: designSystem.typography.fontWeights.semibold,
                  cursor: 'pointer',
                  fontFamily: designSystem.typography.fontFamily,
                  minWidth: 36,
                }}
              >
                {n}
              </Button>
            ))}
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={paginationBtn(safePage === totalPages)}
            >
              →
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle?: string;
  accent: string;
}> = ({ icon, label, value, subtitle, accent }) => (
  <div
    style={{
      background: designSystem.colors.surface,
      border: `1px solid ${designSystem.colors.border}`,
      borderRadius: designSystem.borderRadius.lg,
      boxShadow: designSystem.shadows.sm,
      padding: designSystem.spacing.md,
      display: 'flex',
      alignItems: 'center',
      gap: designSystem.spacing.sm,
    }}
  >
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: designSystem.borderRadius.md,
        background: `${accent}15`,
        color: accent,
      }}
    >
      {icon}
    </span>
    <div>
      <div
        style={{
          fontSize: '11px',
          color: designSystem.colors.text.secondary,
          fontWeight: designSystem.typography.fontWeights.semibold,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: designSystem.typography.fontSizes.xl,
          fontWeight: designSystem.typography.fontWeights.bold,
          color: designSystem.colors.text.primary,
          lineHeight: 1.1,
        }}
      >
        {value.toLocaleString('pt-BR')}
      </div>
      {subtitle && (
        <div style={{ fontSize: '11px', color: designSystem.colors.text.secondary, marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: designSystem.colors.surface,
  border: `1px solid ${designSystem.colors.border}`,
  borderRadius: designSystem.borderRadius.md,
  padding: `${designSystem.spacing.sm} ${designSystem.spacing.md}`,
  paddingLeft: designSystem.spacing['2xl'],
  fontSize: designSystem.typography.fontSizes.sm,
  fontFamily: designSystem.typography.fontFamily,
  color: designSystem.colors.text.primary,
  outline: 'none',
  boxSizing: 'border-box',
};

const thStyle: React.CSSProperties = {
  padding: designSystem.spacing.md,
  fontSize: designSystem.typography.fontSizes.xs,
  fontWeight: designSystem.typography.fontWeights.semibold,
  color: designSystem.colors.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  textAlign: 'left',
};

const primaryBtnStyle: React.CSSProperties = {
  background: designSystem.colors.primary[500],
  color: designSystem.colors.surface,
  border: 'none',
  borderRadius: designSystem.borderRadius.md,
  padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
  fontSize: designSystem.typography.fontSizes.sm,
  fontWeight: designSystem.typography.fontWeights.semibold,
  display: 'inline-flex',
  alignItems: 'center',
  gap: designSystem.spacing.sm,
  cursor: 'pointer',
};

const secondaryBtnStyle: React.CSSProperties = {
  background: designSystem.colors.surface,
  color: designSystem.colors.text.primary,
  border: `1px solid ${designSystem.colors.border}`,
  borderRadius: designSystem.borderRadius.md,
  padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
  fontSize: designSystem.typography.fontSizes.sm,
  fontWeight: designSystem.typography.fontWeights.semibold,
  display: 'inline-flex',
  alignItems: 'center',
  gap: designSystem.spacing.sm,
  cursor: 'pointer',
};

function paginationBtn(disabled: boolean): React.CSSProperties {
  return {
    background: designSystem.colors.surface,
    color: designSystem.colors.text.primary,
    border: `1px solid ${designSystem.colors.border}`,
    borderRadius: designSystem.borderRadius.md,
    padding: `${designSystem.spacing.xs} ${designSystem.spacing.md}`,
    fontSize: designSystem.typography.fontSizes.sm,
    fontWeight: designSystem.typography.fontWeights.semibold,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontFamily: designSystem.typography.fontFamily,
  };
}

export default StockMovements;
