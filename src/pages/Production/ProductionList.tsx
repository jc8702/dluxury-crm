import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Eye,
  Edit3,
  Trash2,
  ChevronUp,
  ChevronDown,
  ClipboardList,
  Calendar,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  X,
  Filter,
  Hammer,
  AlertTriangle,
  Pause,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '../../components/common';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export type ProductionStatus = 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type ProductionBucket = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';

export interface ProductionOrder {
  id: string;
  op_id: string;
  produto: string;
  pecas: number;
  status: ProductionStatus | string;
  statusLabel?: string;
  quotation_id?: string | null;
  quotation_numero?: string | null;
  cliente?: string | null;
  data_inicio?: string;
  data_fim?: string;
  data_prevista_entrega?: string;
  created_at?: string;
  updated_at?: string;
  checklist?: Array<{ id: string; task: string; completed: boolean }>;
  metadata?: { pecas?: any[]; materiais?: any[] };
}

const STATUS_META: Record<
  string,
  { label: string; bg: string; fg: string; border: string; bucket: ProductionBucket }
> = {
  PENDING: {
    label: 'PENDENTE',
    bg: '#FFF4E0',
    fg: '#8A5A00',
    border: '#F0CB7A',
    bucket: 'PENDING',
  },
  AGUARDANDO: {
    label: 'AGUARDANDO',
    bg: '#F0F0F0',
    fg: '#666666',
    border: '#CCCCCC',
    bucket: 'PENDING',
  },
  PAUSED: { label: 'PAUSADO', bg: '#FBE9EB', fg: '#B02A37', border: '#F0A8AE', bucket: 'PAUSED' },
  IN_PROGRESS: {
    label: 'EM PRODUÇÃO',
    bg: '#E0EFFF',
    fg: '#0D5FB8',
    border: '#99C5F0',
    bucket: 'IN_PROGRESS',
  },
  PRODUCAO: {
    label: 'PRODUÇÃO',
    bg: '#E0EFFF',
    fg: '#0D5FB8',
    border: '#99C5F0',
    bucket: 'IN_PROGRESS',
  },
  CORTE: { label: 'CORTE', bg: '#E0EFFF', fg: '#0D5FB8', border: '#99C5F0', bucket: 'IN_PROGRESS' },
  MONTAGEM: {
    label: 'MONTAGEM',
    bg: '#EDE7F6',
    fg: '#5E35B1',
    border: '#B39DDB',
    bucket: 'IN_PROGRESS',
  },
  PINTURA: {
    label: 'PINTURA',
    bg: '#FCE4EC',
    fg: '#AD1457',
    border: '#F48FB1',
    bucket: 'IN_PROGRESS',
  },
  INSPECAO: {
    label: 'INSPEÇÃO',
    bg: '#FFF3CD',
    fg: '#856404',
    border: '#FFE082',
    bucket: 'IN_PROGRESS',
  },
  COMPLETED: {
    label: 'CONCLUÍDO',
    bg: '#E6F4EA',
    fg: '#1E7E34',
    border: '#A8D5B6',
    bucket: 'COMPLETED',
  },
  PRONTO: {
    label: 'PRONTO',
    bg: '#E0F7FA',
    fg: '#006064',
    border: '#80DEEA',
    bucket: 'IN_PROGRESS',
  },
  FINALIZADO: {
    label: 'FINALIZADO',
    bg: '#E6F4EA',
    fg: '#1E7E34',
    border: '#A8D5B6',
    bucket: 'COMPLETED',
  },
  CANCELLED: {
    label: 'CANCELADO',
    bg: '#FBE9EB',
    fg: '#B02A37',
    border: '#F0A8AE',
    bucket: 'PAUSED',
  },
};

const BUCKET_META: Record<
  ProductionBucket,
  { label: string; bg: string; fg: string; border: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: 'PENDENTE',
    bg: '#FFF4E0',
    fg: '#8A5A00',
    border: '#F0CB7A',
    icon: <Clock size={12} />,
  },
  IN_PROGRESS: {
    label: 'EM PRODUÇÃO',
    bg: '#E0EFFF',
    fg: '#0D5FB8',
    border: '#99C5F0',
    icon: <Hammer size={12} />,
  },
  PAUSED: {
    label: 'PAUSADO',
    bg: '#FBE9EB',
    fg: '#B02A37',
    border: '#F0A8AE',
    icon: <Pause size={12} />,
  },
  COMPLETED: {
    label: 'CONCLUÍDO',
    bg: '#E6F4EA',
    fg: '#1E7E34',
    border: '#A8D5B6',
    icon: <CheckCircle2 size={12} />,
  },
};

const KANBAN_COLUMNS: {
  bucket: ProductionBucket;
  title: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  { bucket: 'PENDING', title: 'Pendente', color: '#8A5A00', icon: <Clock size={14} /> },
  { bucket: 'IN_PROGRESS', title: 'Em Produção', color: '#0D5FB8', icon: <Hammer size={14} /> },
  { bucket: 'PAUSED', title: 'Pausado', color: '#B02A37', icon: <Pause size={14} /> },
  { bucket: 'COMPLETED', title: 'Concluído', color: '#1E7E34', icon: <CheckCircle2 size={14} /> },
];

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
};

const isLate = (iso?: string) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
};

const toBucket = (raw: string | undefined | null): ProductionBucket => {
  const meta = STATUS_META[(raw || '').toUpperCase()];
  return meta?.bucket || 'PENDING';
};

type SortKey = 'op' | 'orcamento' | 'status' | 'data' | 'cliente';
type SortDir = 'asc' | 'desc';
type ViewMode = 'table' | 'kanban';

interface ProductionListProps {
  onCreate?: () => void;
  onView?: (op: ProductionOrder) => void;
  onEdit?: (op: ProductionOrder) => void;
  onDelete?: (op: ProductionOrder) => void;
  onRefresh?: () => void;
}

export const ProductionList: React.FC<ProductionListProps> = ({
  onCreate,
  onView,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductionStatus | 'CANCELLED'>('all');
  const [bucketFilter, setBucketFilter] = useState<'all' | ProductionBucket>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('data');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>('table');
  const pageSize = 10;
  const { error: toastError, success: toastSuccess } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await api.production.list();
      const normalized: ProductionOrder[] = (data || []).map((o: any) => ({
        ...o,
        op_id: o.op_id || o.id,
        produto: o.produto || o.nome || '—',
        status: (o.status || 'PENDING').toString().toUpperCase(),
        pecas: Number(o.pecas || 1),
      }));
      setOrders(normalized);
    } catch (err: any) {
      toastError('Erro ao carregar ordens', err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const handler = () => fetchOrders();
    window.addEventListener('op_created', handler as any);
    window.addEventListener('op_updated', handler as any);
    window.addEventListener('op_deleted', handler as any);
    return () => {
      window.removeEventListener('op_created', handler as any);
      window.removeEventListener('op_updated', handler as any);
      window.removeEventListener('op_deleted', handler as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (bucketFilter !== 'all' && toBucket(o.status) !== bucketFilter) return false;
      if (dateFrom) {
        const d = new Date(o.data_inicio || o.created_at || 0);
        const from = new Date(dateFrom);
        if (d < from) return false;
      }
      if (dateTo) {
        const d = new Date(o.data_inicio || o.created_at || 0);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      if (term) {
        const p = (o.produto || '').toLowerCase();
        const op = (o.op_id || '').toLowerCase();
        const q = (o.quotation_numero || '').toLowerCase();
        if (!p.includes(term) && !op.includes(term) && !q.includes(term)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, bucketFilter, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      switch (sortKey) {
        case 'op':
          va = a.op_id || '';
          vb = b.op_id || '';
          break;
        case 'orcamento':
          va = a.quotation_numero || '';
          vb = b.quotation_numero || '';
          break;
        case 'status':
          va = toBucket(a.status);
          vb = toBucket(b.status);
          break;
        case 'cliente':
          va = (a.cliente || '').toLowerCase();
          vb = (b.cliente || '').toLowerCase();
          break;
        case 'data':
          va = new Date(a.data_inicio || a.created_at || 0).getTime();
          vb = new Date(b.data_inicio || b.created_at || 0).getTime();
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
    const buckets: Record<ProductionBucket, number> = {
      PENDING: 0,
      IN_PROGRESS: 0,
      PAUSED: 0,
      COMPLETED: 0,
    };
    let late = 0;
    orders.forEach((o) => {
      buckets[toBucket(o.status)] += 1;
      if (isLate(o.data_prevista_entrega) && toBucket(o.status) !== 'COMPLETED') late += 1;
    });
    return { buckets, late, total: orders.length };
  }, [orders]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setBucketFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilter =
    !!search || statusFilter !== 'all' || bucketFilter !== 'all' || !!dateFrom || !!dateTo;

  const handleDelete = async (op: ProductionOrder) => {
    if (!confirm(`Deseja realmente excluir a ordem ${op.op_id}?`)) return;
    try {
      await api.production.delete(op.op_id);
      toastSuccess(`Ordem ${op.op_id} removida`);
      fetchOrders();
    } catch (err: any) {
      toastError('Erro ao excluir', err?.message || String(err));
    }
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
          padding: '16px',
          fontSize: '12px',
          fontWeight: 600,
          color: active ? '#0D5FB8' : '#666666',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          textAlign: align,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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

  const renderStatusBadge = (raw: string) => {
    const meta = STATUS_META[raw?.toUpperCase()] || STATUS_META.PENDING;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: `4px 8px`,
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 700,
          background: meta.bg,
          color: meta.fg,
          border: `1px solid ${meta.border}`,
          letterSpacing: '0.04em',
        }}
      >
        {meta.label}
      </span>
    );
  };

  const renderBucketBadge = (raw: string) => {
    const b = toBucket(raw);
    const meta = BUCKET_META[b];
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: `2px 8px`,
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          background: meta.bg,
          color: meta.fg,
          border: `1px solid ${meta.border}`,
        }}
      >
        {meta.icon}
        {meta.label}
      </span>
    );
  };

  return (
    <div
      className="ds-production-list"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        padding: '24px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: '#1A1A1A',
      }}
    >
      <style>{`
        .ds-production-list input:focus, .ds-production-list select:focus {
          border-color: #0D66CC !important;
          box-shadow: 0 0 0 3px #E0EFFF;
        }
        .ds-production-list table tbody tr { transition: background-color 0.15s ease, box-shadow 0.15s ease; }
        .ds-production-list table tbody tr:hover { background: #FAFAFA; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .ds-production-list .ds-row-actions { opacity: 0.7; transition: opacity 0.15s ease; }
        .ds-production-list table tbody tr:hover .ds-row-actions { opacity: 1; }
        .ds-production-list .ds-kanban-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .ds-production-list .ds-kanban-card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      `}</style>

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#1A1A1A',
              margin: 0,
              lineHeight: 1.2,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Hammer size={28} color={'#0D5FB8'} />
            Ordens de Produção
          </h1>
          <p
            style={{
              color: '#666666',
              fontSize: '14px',
              margin: `4px 0 0 0`,
            }}
          >
            Acompanhe o fluxo fabril,Cutting Plan e status das OPs em tempo real.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            onClick={() => {
              fetchOrders();
              onRefresh?.();
            }}
            style={{
              background: '#FFFFFF',
              color: '#1A1A1A',
              border: `1px solid #E0E0E0`,
              borderRadius: '8px',
              padding: `8px 24px`,
              fontSize: '14px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
            aria-label="Atualizar lista"
          >
            <RefreshCw size={16} /> Atualizar
          </Button>
          {onCreate && (
            <Button
              onClick={onCreate}
              style={{
                background: '#0D66CC',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: `8px 24px`,
                fontSize: '14px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: `0 4px 12px #0D66CC40`,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} /> Nova OP
            </Button>
          )}
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
        }}
      >
        {(['PENDING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED'] as ProductionBucket[]).map((b) => {
          const meta = BUCKET_META[b];
          const active = bucketFilter === b;
          return (
            <button
              key={b}
              type="button"
              onClick={() => setBucketFilter(active ? 'all' : b)}
              style={{
                background: active ? meta.bg : '#FFFFFF',
                border: `1px solid ${active ? meta.border : '#E0E0E0'}`,
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'all 0.15s ease',
              }}
              aria-pressed={active}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: meta.bg,
                  color: meta.fg,
                }}
              >
                {meta.icon}
              </span>
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    color: meta.fg,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {meta.label}
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#1A1A1A',
                    lineHeight: 1.1,
                  }}
                >
                  {metrics.buckets[b]}
                </div>
              </div>
            </button>
          );
        })}
        <div
          style={{
            background: metrics.late > 0 ? '#FBE9EB' : '#FFFFFF',
            border: `1px solid ${metrics.late > 0 ? '#F0A8AE' : '#E0E0E0'}`,
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: '#FBE9EB',
              color: '#DC3545',
            }}
          >
            <AlertTriangle size={16} />
          </span>
          <div>
            <div
              style={{
                fontSize: '11px',
                color: '#DC3545',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Em Atraso
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#1A1A1A',
                lineHeight: 1.1,
              }}
            >
              {metrics.late}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#666666',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            <Filter size={14} /> Filtros
          </div>
          <div
            style={{
              display: 'inline-flex',
              background: '#FAFAFA',
              borderRadius: '8px',
              padding: 2,
              border: `1px solid #E0E0E0`,
            }}
          >
            <button
              type="button"
              onClick={() => setView('table')}
              aria-pressed={view === 'table'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: `4px 16px`,
                background: view === 'table' ? '#FFFFFF' : 'transparent',
                color: view === 'table' ? '#0D5FB8' : '#666666',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: view === 'table' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <TableIcon size={14} /> Tabela
            </button>
            <button
              type="button"
              onClick={() => setView('kanban')}
              aria-pressed={view === 'kanban'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: `4px 16px`,
                background: view === 'kanban' ? '#FFFFFF' : 'transparent',
                color: view === 'kanban' ? '#0D5FB8' : '#666666',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: view === 'kanban' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#666666',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Buscar por OP, produto ou orçamento…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Buscar ordens"
              style={{
                width: '100%',
                background: '#FFFFFF',
                border: `1px solid #E0E0E0`,
                borderRadius: '8px',
                padding: `8px 16px`,
                paddingLeft: '48px',
                fontSize: '14px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: '#1A1A1A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            aria-label="Filtrar por status"
            style={{
              background: '#FFFFFF',
              border: `1px solid #E0E0E0`,
              borderRadius: '8px',
              padding: `8px 16px`,
              fontSize: '14px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: '#1A1A1A',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Todos os status</option>
            {Object.entries(STATUS_META).map(([k, m]) => (
              <option key={k} value={k}>
                {m.label}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={14} color={'#666666'} />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              aria-label="Data inicial"
              style={{
                flex: 1,
                background: '#FFFFFF',
                border: `1px solid #E0E0E0`,
                borderRadius: '8px',
                padding: `8px 16px`,
                fontSize: '12px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: '#1A1A1A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span
              style={{
                color: '#666666',
                fontSize: '12px',
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
              style={{
                flex: 1,
                background: '#FFFFFF',
                border: `1px solid #E0E0E0`,
                borderRadius: '8px',
                padding: `8px 16px`,
                fontSize: '12px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: '#1A1A1A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                background: 'transparent',
                color: '#DC3545',
                border: `1px solid #E0E0E0`,
                borderRadius: '8px',
                padding: `8px 16px`,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <X size={12} /> Limpar filtros
            </button>
          )}
        </div>

        {view === 'table' ? (
          <>
            <div
              style={{
                width: '100%',
                overflowX: 'auto',
                borderRadius: '8px',
                border: `1px solid #E0E0E0`,
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                }}
                role="table"
                aria-label="Lista de ordens de produção"
              >
                <thead>
                  <tr
                    style={{
                      background: '#FAFAFA',
                      borderBottom: `2px solid #E0E0E0`,
                    }}
                  >
                    <SortHeader k="op" label="Ordem #" />
                    <SortHeader k="orcamento" label="Orçamento" />
                    <SortHeader k="cliente" label="Cliente" />
                    <SortHeader k="status" label="Status" />
                    <SortHeader k="data" label="Data" />
                    <th
                      style={{
                        padding: '16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#666666',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        textAlign: 'right',
                      }}
                    >
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: '48px',
                          textAlign: 'center',
                          color: '#666666',
                        }}
                      >
                        Carregando ordens…
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: '48px',
                          textAlign: 'center',
                          color: '#666666',
                        }}
                      >
                        <ClipboardList
                          size={32}
                          style={{ opacity: 0.3, margin: '0 auto', display: 'block' }}
                        />
                        <p style={{ margin: `8px 0 0 0` }}>
                          {hasActiveFilter
                            ? 'Nenhuma ordem encontrada com os filtros atuais.'
                            : 'Nenhuma ordem cadastrada.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((op) => {
                      const late =
                        isLate(op.data_prevista_entrega) && toBucket(op.status) !== 'COMPLETED';
                      return (
                        <tr key={op.op_id} style={{ borderBottom: `1px solid #E0E0E0` }}>
                          <td style={{ padding: '16px' }}>
                            <div
                              style={{
                                fontWeight: 700,
                                color: '#0D5FB8',
                                fontFamily: 'monospace',
                              }}
                            >
                              #{op.op_id}
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#666666',
                                marginTop: 2,
                              }}
                            >
                              {op.pecas} {op.pecas === 1 ? 'peça' : 'peças'}
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            {op.quotation_numero ? (
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: '#1A1A1A',
                                }}
                              >
                                #{op.quotation_numero}
                              </div>
                            ) : (
                              <span
                                style={{
                                  color: '#CCCCCC',
                                  fontSize: '12px',
                                }}
                              >
                                Sem orçamento
                              </span>
                            )}
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#666666',
                                marginTop: 2,
                              }}
                            >
                              {op.produto}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: '16px',
                              color: '#666666',
                              fontSize: '14px',
                            }}
                          >
                            {op.cliente || '—'}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                                alignItems: 'flex-start',
                              }}
                            >
                              {renderStatusBadge(op.status)}
                              {renderBucketBadge(op.status)}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: '16px',
                              color: late ? '#DC3545' : '#666666',
                              fontSize: '14px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {late && <AlertTriangle size={12} />}
                              {formatDate(
                                op.data_prevista_entrega || op.data_inicio || op.created_at,
                              )}
                            </div>
                            {op.data_prevista_entrega && (
                              <div
                                style={{
                                  fontSize: '11px',
                                  color: '#666666',
                                  marginTop: 2,
                                }}
                              >
                                Previsão
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div
                              className="ds-row-actions"
                              style={{ display: 'inline-flex', gap: '4px' }}
                            >
                              {onView && (
                                <button
                                  type="button"
                                  onClick={() => onView(op)}
                                  aria-label={`Visualizar ${op.op_id}`}
                                  title="Visualizar"
                                  style={iconBtn('#17A2B8', '#D1ECF1', '#7FC5D9')}
                                >
                                  <Eye size={12} />
                                </button>
                              )}
                              {onEdit && (
                                <button
                                  type="button"
                                  onClick={() => onEdit(op)}
                                  aria-label={`Editar ${op.op_id}`}
                                  title="Editar"
                                  style={iconBtn('#0D5FB8', '#F0F7FF', '#E0EFFF')}
                                >
                                  <Edit3 size={12} />
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  type="button"
                                  onClick={() => (onDelete ? onDelete(op) : handleDelete(op))}
                                  aria-label={`Excluir ${op.op_id}`}
                                  title="Excluir"
                                  style={iconBtn('#DC3545', '#FBE9EB', '#F0A8AE')}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
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
                  gap: '4px',
                  marginTop: '24px',
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
                      background: n === safePage ? '#0D66CC' : '#FFFFFF',
                      color: n === safePage ? '#FFFFFF' : '#1A1A1A',
                      border: `1px solid ${n === safePage ? '#0D66CC' : '#E0E0E0'}`,
                      borderRadius: '8px',
                      padding: `4px 16px`,
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
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
          </>
        ) : (
          <KanbanView
            orders={sorted}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            fallbackDelete={handleDelete}
          />
        )}
      </section>
    </div>
  );
};

const KanbanView: React.FC<{
  orders: ProductionOrder[];
  onView?: (op: ProductionOrder) => void;
  onEdit?: (op: ProductionOrder) => void;
  onDelete?: (op: ProductionOrder) => void;
  fallbackDelete: (op: ProductionOrder) => void;
}> = ({ orders, onView, onEdit, onDelete, fallbackDelete }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
      }}
    >
      {KANBAN_COLUMNS.map((col) => {
        const items = orders.filter((o) => toBucket(o.status) === col.bucket);
        return (
          <div
            key={col.bucket}
            style={{
              background: '#FAFAFA',
              borderRadius: '12px',
              border: `1px solid #E0E0E0`,
              padding: '16px',
              minHeight: 200,
            }}
          >
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: `2px solid ${col.color}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: col.color,
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {col.icon} {col.title}
              </div>
              <span
                style={{
                  background: col.color,
                  color: '#FFFFFF',
                  borderRadius: '9999px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {items.length}
              </span>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.length === 0 && (
                <div
                  style={{
                    color: '#666666',
                    fontSize: '12px',
                    textAlign: 'center',
                    padding: '24px',
                  }}
                >
                  Nenhuma ordem
                </div>
              )}
              {items.map((op) => (
                <div
                  key={op.op_id}
                  className="ds-kanban-card"
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid #E0E0E0`,
                    borderLeft: `3px solid ${col.color}`,
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                  }}
                  onClick={() => onView?.(op)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: '#0D5FB8',
                        fontWeight: 700,
                      }}
                    >
                      #{op.op_id}
                    </span>
                    <span style={{ fontSize: '11px', color: '#666666' }}>
                      {op.pecas} {op.pecas === 1 ? 'peça' : 'peças'}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#1A1A1A',
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {op.produto}
                  </div>
                  {op.cliente && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#666666',
                        marginBottom: 6,
                      }}
                    >
                      {op.cliente}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#666666' }}>
                      {formatDate(op.data_prevista_entrega || op.data_inicio || op.created_at)}
                    </span>
                    <div style={{ display: 'flex', gap: 2 }} onClick={(e) => e.stopPropagation()}>
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(op)}
                          aria-label={`Editar ${op.op_id}`}
                          style={iconBtn('#0D5FB8', '#F0F7FF', '#E0EFFF', 24)}
                        >
                          <Edit3 size={10} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => (onDelete ? onDelete(op) : fallbackDelete(op))}
                        aria-label={`Excluir ${op.op_id}`}
                        style={iconBtn('#DC3545', '#FBE9EB', '#F0A8AE', 24)}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

function iconBtn(color: string, bgHover: string, border: string, size = 32): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    background: 'transparent',
    color,
    border: `1px solid ${border}`,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };
}

function paginationBtn(disabled: boolean): React.CSSProperties {
  return {
    background: '#FFFFFF',
    color: '#1A1A1A',
    border: `1px solid #E0E0E0`,
    borderRadius: '8px',
    padding: `4px 16px`,
    fontSize: '14px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };
}

export default ProductionList;
