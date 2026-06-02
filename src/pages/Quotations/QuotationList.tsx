import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Eye,
  Edit3,
  Trash2,
  ChevronUp,
  ChevronDown,
  FileText,
  Calendar,
  User,
  X,
} from 'lucide-react';
import { designSystem } from '@/styles/design-system';
import { Button } from '../../components/common';

export type QuotationStatus =
  | 'RASCUNHO'
  | 'ENVIADO'
  | 'APROVADO'
  | 'REJEITADO'
  | 'NEGOCIACAO'
  | 'FECHADA'
  | 'PERDIDA';

export interface Quotation {
  id: string;
  numeroOrcamento: string;
  clienteId?: string | null;
  clienteNome?: string;
  cliente?: { nome?: string; cidade?: string; uf?: string } | null;
  margemLucroPercentual?: number;
  taxaFinanceiraPercentual?: number;
  validadeDias?: number;
  status: QuotationStatus;
  valorTotalVenda?: number;
  createdAt?: string;
  updatedAt?: string;
}

const STATUS_META: Record<
  QuotationStatus,
  { label: string; bg: string; fg: string; border: string }
> = {
  RASCUNHO: { label: 'RASCUNHO', bg: '#F0F0F0', fg: '#666666', border: '#CCCCCC' },
  ENVIADO: { label: 'ENVIADO', bg: '#E0EFFF', fg: '#0D5FB8', border: '#99C5F0' },
  APROVADO: { label: 'APROVADO', bg: '#E6F4EA', fg: '#1E7E34', border: '#A8D5B6' },
  REJEITADO: { label: 'REJEITADO', bg: '#FBE9EB', fg: '#B02A37', border: '#F0A8AE' },
  NEGOCIACAO: { label: 'NEGOCIAÇÃO', bg: '#FFF4E0', fg: '#8A5A00', border: '#F0CB7A' },
  FECHADA: { label: 'FECHADA', bg: '#E6F4EA', fg: '#1E7E34', border: '#A8D5B6' },
  PERDIDA: { label: 'PERDIDA', bg: '#FBE9EB', fg: '#B02A37', border: '#F0A8AE' },
};

const formatCurrency = (v?: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
};

type SortKey = 'numero' | 'cliente' | 'valor' | 'status' | 'data';
type SortDir = 'asc' | 'desc';

interface QuotationListProps {
  quotations: Quotation[];
  loading?: boolean;
  onCreate: () => void;
  onView: (q: Quotation) => void;
  onEdit: (q: Quotation) => void;
  onDelete: (q: Quotation) => void;
  onRefresh?: () => void;
}

export const QuotationList: React.FC<QuotationListProps> = ({
  quotations,
  loading,
  onCreate,
  onView,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | QuotationStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('data');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Build client list from quotations
  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    quotations.forEach((q) => {
      const name = q.cliente?.nome || q.clienteNome;
      if (name && q.clienteId) map.set(q.clienteId, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [quotations]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quotations.filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (clientFilter !== 'all' && q.clienteId !== clientFilter) return false;
      if (dateFrom) {
        const d = new Date(q.createdAt || 0);
        const from = new Date(dateFrom);
        if (d < from) return false;
      }
      if (dateTo) {
        const d = new Date(q.createdAt || 0);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      if (term) {
        const n = (q.cliente?.nome || q.clienteNome || '').toLowerCase();
        const num = (q.numeroOrcamento || '').toLowerCase();
        if (!n.includes(term) && !num.includes(term)) return false;
      }
      return true;
    });
  }, [quotations, search, statusFilter, dateFrom, dateTo, clientFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      switch (sortKey) {
        case 'numero':
          va = a.numeroOrcamento || '';
          vb = b.numeroOrcamento || '';
          break;
        case 'cliente':
          va = (a.cliente?.nome || a.clienteNome || '').toLowerCase();
          vb = (b.cliente?.nome || b.clienteNome || '').toLowerCase();
          break;
        case 'valor':
          va = a.valorTotalVenda || 0;
          vb = b.valorTotalVenda || 0;
          break;
        case 'status':
          va = a.status;
          vb = b.status;
          break;
        case 'data':
          va = new Date(a.createdAt || 0).getTime();
          vb = new Date(b.createdAt || 0).getTime();
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
    setDateFrom('');
    setDateTo('');
    setClientFilter('all');
    setPage(1);
  };

  const hasActiveFilter =
    search || statusFilter !== 'all' || dateFrom || dateTo || clientFilter !== 'all';

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
      className="ds-quotation-list"
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
        .ds-quotation-list input:focus, .ds-quotation-list select:focus {
          border-color: ${designSystem.colors.primary[500]} !important;
          box-shadow: 0 0 0 3px ${designSystem.colors.primary[100]};
        }
        .ds-quotation-list table tbody tr { transition: background-color 0.15s ease, box-shadow 0.15s ease; }
        .ds-quotation-list table tbody tr:hover { background: ${designSystem.colors.background}; box-shadow: ${designSystem.shadows.sm}; }
        .ds-quotation-list .ds-row-actions { opacity: 0.7; transition: opacity 0.15s ease; }
        .ds-quotation-list table tbody tr:hover .ds-row-actions { opacity: 1; }
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
        <div>
          <h1
            style={{
              fontSize: designSystem.typography.fontSizes['3xl'],
              fontWeight: designSystem.typography.fontWeights.bold,
              color: designSystem.colors.text.primary,
              margin: 0,
              lineHeight: designSystem.typography.lineHeights.tight,
            }}
          >
            Orçamentos
          </h1>
          <p
            style={{
              color: designSystem.colors.text.secondary,
              fontSize: designSystem.typography.fontSizes.sm,
              margin: `${designSystem.spacing.xs} 0 0 0`,
            }}
          >
            Gestão de propostas industriais e cálculos de engenharia
          </p>
        </div>
        <Button
          onClick={onCreate}
          style={{
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
            boxShadow: `0 4px 12px ${designSystem.colors.primary[500]}40`,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Novo Orçamento
        </Button>
      </header>

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
              placeholder="Buscar por número ou cliente…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Buscar orçamentos"
              style={{
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
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(1);
            }}
            aria-label="Filtrar por status"
            style={{
              background: designSystem.colors.surface,
              border: `1px solid ${designSystem.colors.border}`,
              borderRadius: designSystem.borderRadius.md,
              padding: `${designSystem.spacing.sm} ${designSystem.spacing.md}`,
              fontSize: designSystem.typography.fontSizes.sm,
              fontFamily: designSystem.typography.fontFamily,
              color: designSystem.colors.text.primary,
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

          <select
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por cliente"
            style={{
              background: designSystem.colors.surface,
              border: `1px solid ${designSystem.colors.border}`,
              borderRadius: designSystem.borderRadius.md,
              padding: `${designSystem.spacing.sm} ${designSystem.spacing.md}`,
              fontSize: designSystem.typography.fontSizes.sm,
              fontFamily: designSystem.typography.fontFamily,
              color: designSystem.colors.text.primary,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Todos os clientes</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
              style={{
                flex: 1,
                background: designSystem.colors.surface,
                border: `1px solid ${designSystem.colors.border}`,
                borderRadius: designSystem.borderRadius.md,
                padding: `${designSystem.spacing.sm} ${designSystem.spacing.md}`,
                fontSize: designSystem.typography.fontSizes.xs,
                fontFamily: designSystem.typography.fontFamily,
                color: designSystem.colors.text.primary,
                outline: 'none',
                boxSizing: 'border-box',
              }}
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
              style={{
                flex: 1,
                background: designSystem.colors.surface,
                border: `1px solid ${designSystem.colors.border}`,
                borderRadius: designSystem.borderRadius.md,
                padding: `${designSystem.spacing.sm} ${designSystem.spacing.md}`,
                fontSize: designSystem.typography.fontSizes.xs,
                fontFamily: designSystem.typography.fontFamily,
                color: designSystem.colors.text.primary,
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
            aria-label="Lista de orçamentos"
          >
            <thead>
              <tr
                style={{
                  background: designSystem.colors.background,
                  borderBottom: `2px solid ${designSystem.colors.border}`,
                }}
              >
                <SortHeader k="numero" label="Número" />
                <SortHeader k="cliente" label="Cliente" />
                <SortHeader k="valor" label="Valor" align="right" />
                <SortHeader k="status" label="Status" />
                <SortHeader k="data" label="Data" />
                <th
                  style={{
                    padding: designSystem.spacing.md,
                    fontSize: designSystem.typography.fontSizes.xs,
                    fontWeight: designSystem.typography.fontWeights.semibold,
                    color: designSystem.colors.text.secondary,
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
                      padding: designSystem.spacing['2xl'],
                      textAlign: 'center',
                      color: designSystem.colors.text.secondary,
                    }}
                  >
                    Carregando orçamentos...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: designSystem.spacing['2xl'],
                      textAlign: 'center',
                      color: designSystem.colors.text.secondary,
                    }}
                  >
                    <FileText
                      size={32}
                      style={{ opacity: 0.3, margin: '0 auto', display: 'block' }}
                    />
                    <p style={{ margin: `${designSystem.spacing.sm} 0 0 0` }}>
                      {hasActiveFilter
                        ? 'Nenhum orçamento encontrado com os filtros atuais.'
                        : 'Nenhum orçamento cadastrado.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((q) => {
                  const meta = STATUS_META[q.status] || STATUS_META.RASCUNHO;
                  const clientName = q.cliente?.nome || q.clienteNome || '—';
                  return (
                    <tr
                      key={q.id}
                      style={{ borderBottom: `1px solid ${designSystem.colors.border}` }}
                    >
                      <td style={{ padding: designSystem.spacing.md }}>
                        <div
                          style={{
                            fontWeight: designSystem.typography.fontWeights.bold,
                            color: designSystem.colors.primary[600],
                            fontFamily: 'monospace',
                          }}
                        >
                          #{q.numeroOrcamento}
                        </div>
                      </td>
                      <td style={{ padding: designSystem.spacing.md }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: designSystem.spacing.xs,
                            color: designSystem.colors.text.primary,
                            fontWeight: designSystem.typography.fontWeights.semibold,
                          }}
                        >
                          <User size={12} color={designSystem.colors.text.secondary} />
                          {clientName}
                        </div>
                        {q.cliente?.cidade && (
                          <div
                            style={{
                              fontSize: designSystem.typography.fontSizes.xs,
                              color: designSystem.colors.text.secondary,
                              marginTop: 2,
                            }}
                          >
                            {q.cliente.cidade}/{q.cliente.uf || '—'}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: designSystem.spacing.md,
                          textAlign: 'right',
                          fontWeight: designSystem.typography.fontWeights.bold,
                          color: designSystem.colors.text.primary,
                        }}
                      >
                        {formatCurrency(q.valorTotalVenda)}
                      </td>
                      <td style={{ padding: designSystem.spacing.md }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: `${designSystem.spacing.xs} ${designSystem.spacing.sm}`,
                            borderRadius: designSystem.borderRadius.full,
                            fontSize: designSystem.typography.fontSizes.xs,
                            fontWeight: designSystem.typography.fontWeights.bold,
                            background: meta.bg,
                            color: meta.fg,
                            border: `1px solid ${meta.border}`,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: designSystem.spacing.md,
                          color: designSystem.colors.text.secondary,
                          fontSize: designSystem.typography.fontSizes.sm,
                        }}
                      >
                        {formatDate(q.createdAt)}
                      </td>
                      <td style={{ padding: designSystem.spacing.md, textAlign: 'right' }}>
                        <div
                          className="ds-row-actions"
                          style={{ display: 'inline-flex', gap: designSystem.spacing.xs }}
                        >
                          <button
                            type="button"
                            onClick={() => onView(q)}
                            aria-label={`Visualizar ${q.numeroOrcamento}`}
                            title="Visualizar"
                            style={iconBtn(designSystem.colors.info, '#D1ECF1', '#7FC5D9')}
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(q)}
                            aria-label={`Editar ${q.numeroOrcamento}`}
                            title="Editar"
                            style={iconBtn(
                              designSystem.colors.primary[600],
                              designSystem.colors.primary[50],
                              designSystem.colors.primary[100],
                            )}
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(q)}
                            aria-label={`Excluir ${q.numeroOrcamento}`}
                            title="Excluir"
                            style={iconBtn(designSystem.colors.error, '#FBE9EB', '#F0A8AE')}
                          >
                            <Trash2 size={12} />
                          </button>
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

        {onRefresh && (
          <div style={{ marginTop: designSystem.spacing.md, textAlign: 'right' }}>
            <button
              type="button"
              onClick={onRefresh}
              style={{
                background: 'transparent',
                color: designSystem.colors.primary[600],
                border: 'none',
                fontSize: designSystem.typography.fontSizes.xs,
                fontWeight: designSystem.typography.fontWeights.semibold,
                cursor: 'pointer',
                fontFamily: designSystem.typography.fontFamily,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Atualizar
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

function iconBtn(color: string, bgHover: string, border: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    background: 'transparent',
    color,
    border: `1px solid ${border}`,
    borderRadius: designSystem.borderRadius.md,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    fontFamily: designSystem.typography.fontFamily,
  };
}

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

export default QuotationList;
