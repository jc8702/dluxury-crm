import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  Package,
  Edit3,
  Trash2,
  ArrowDownCircle,
  X,
  Filter,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Tag,
  FileDown,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { useInventoryStore as useInventory } from '../../stores/useInventoryStore';
import { useToast } from '../../context/ToastContext';
import type { Material, CategoriaMaterial } from '../../types';

type StockStatus = 'em_estoque' | 'baixo' | 'fora';

const STATUS_META: Record<
  StockStatus,
  { label: string; bg: string; fg: string; border: string; icon: React.ReactNode }
> = {
  em_estoque: {
    label: 'EM ESTOQUE',
    bg: '#E6F4EA',
    fg: '#1E7E34',
    border: '#A8D5B6',
    icon: <CheckCircle2 size={12} />,
  },
  baixo: {
    label: 'BAIXO',
    bg: '#FFF4E0',
    fg: '#8A5A00',
    border: '#F0CB7A',
    icon: <AlertTriangle size={12} />,
  },
  fora: {
    label: 'FORA DE ESTOQUE',
    bg: '#FBE9EB',
    fg: '#B02A37',
    border: '#F0A8AE',
    icon: <AlertTriangle size={12} />,
  },
};

const deriveStatus = (atual: number, minimo: number): StockStatus => {
  if (atual <= 0) return 'fora';
  if (atual <= minimo) return 'baixo';
  return 'em_estoque';
};

const formatCurrency = (v?: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

type SortKey = 'sku' | 'nome' | 'categoria' | 'quantidade' | 'status' | 'localizacao';
type SortDir = 'asc' | 'desc';

export interface StockListProps {
  onCreate?: () => void;
  onEdit?: (m: Material) => void;
  onDelete?: (m: Material) => void;
  onEntry?: (m: Material) => void;
  onExit?: (m: Material) => void;
  onRefresh?: () => void;
  onOpenMovements?: () => void;
}

export const StockList: React.FC<StockListProps> = ({
  onCreate,
  onEdit,
  onDelete,
  onEntry,
  onExit: _onExit,
  onRefresh,
  onOpenMovements,
}) => {
  const { materiais, categorias, removeMaterial, reloadInventoryData } = useInventory();
  const { error: toastError, success: toastSuccess } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StockStatus>('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('nome');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    reloadInventoryData().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locations = useMemo(() => {
    const set = new Set<string>();
    materiais.forEach((m) => {
      const loc = (m as any).localizacao as string | undefined;
      if (loc) set.add(loc);
    });
    return Array.from(set).sort();
  }, [materiais]);

  const enriched = useMemo(() => {
    return materiais
      .filter((m) => m && m.id)
      .map((m) => {
        const status = deriveStatus(Number(m.estoque_atual || 0), Number(m.estoque_minimo || 0));
        const cat: CategoriaMaterial | undefined = categorias.find((c) => c.id === m.categoria_id);
        return {
          material: m,
          status,
          categoria: cat,
          localizacao: (m as any).localizacao as string | undefined,
        };
      });
  }, [materiais, categorias]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enriched.filter(({ material, status, localizacao }) => {
      if (categoryFilter !== 'all' && material.categoria_id !== categoryFilter) return false;
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (locationFilter !== 'all' && localizacao !== locationFilter) return false;
      if (term) {
        const t = term;
        const matchSku = (material.sku || '').toLowerCase().includes(t);
        const matchNome = (material.nome || '').toLowerCase().includes(t);
        const matchDesc = (material.descricao || '').toLowerCase().includes(t);
        if (!matchSku && !matchNome && !matchDesc) return false;
      }
      return true;
    });
  }, [enriched, search, categoryFilter, statusFilter, locationFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      switch (sortKey) {
        case 'sku':
          va = (a.material.sku || '').toLowerCase();
          vb = (b.material.sku || '').toLowerCase();
          break;
        case 'nome':
          va = (a.material.nome || '').toLowerCase();
          vb = (b.material.nome || '').toLowerCase();
          break;
        case 'categoria':
          va = (a.categoria?.nome || '').toLowerCase();
          vb = (b.categoria?.nome || '').toLowerCase();
          break;
        case 'quantidade':
          va = Number(a.material.estoque_atual || 0);
          vb = Number(b.material.estoque_atual || 0);
          break;
        case 'localizacao':
          va = (a.localizacao || '').toLowerCase();
          vb = (b.localizacao || '').toLowerCase();
          break;
        case 'status':
          va = a.status;
          vb = b.status;
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
    const totals: Record<StockStatus, number> = { em_estoque: 0, baixo: 0, fora: 0 };
    let totalValue = 0;
    enriched.forEach(({ material, status }) => {
      totals[status] += 1;
      totalValue += Number(material.estoque_atual || 0) * Number(material.preco_custo || 0);
    });
    return { totals, totalValue, total: enriched.length };
  }, [enriched]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setLocationFilter('all');
    setPage(1);
  };

  const hasActiveFilter =
    !!search || categoryFilter !== 'all' || statusFilter !== 'all' || locationFilter !== 'all';

  const handleDelete = async (m: Material) => {
    if (!confirm(`Excluir material "${m.nome}"?`)) return;
    try {
      await removeMaterial(m.id);
      toastSuccess('Material excluído');
    } catch (e: any) {
      toastError('Erro ao excluir', e?.message || String(e));
    }
  };

  const handleExportCsv = () => {
    const rows = sorted.map(({ material, status, categoria, localizacao }) => ({
      SKU: material.sku,
      Nome: material.nome,
      Categoria: categoria?.nome || '',
      Quantidade: Number(material.estoque_atual || 0),
      Unidade: material.unidade_compra || '',
      'Estoque Mínimo': Number(material.estoque_minimo || 0),
      Localizacao: localizacao || '',
      Status: STATUS_META[status].label,
      'Preço Custo': Number(material.preco_custo || 0),
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
    link.download = `estoque-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastSuccess('CSV exportado');
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

  return (
    <div
      className="ds-stock-list"
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
        .ds-stock-list input:focus, .ds-stock-list select:focus {
          border-color: #0D66CC !important;
          box-shadow: 0 0 0 3px #E0EFFF;
        }
        .ds-stock-list table tbody tr { transition: background-color 0.15s ease, box-shadow 0.15s ease; }
        .ds-stock-list table tbody tr:hover { background: #FAFAFA; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .ds-stock-list .ds-row-actions { opacity: 0.7; transition: opacity 0.15s ease; }
        .ds-stock-list table tbody tr:hover .ds-row-actions { opacity: 1; }
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
            <Package size={28} color={'#0D5FB8'} />
            Estoque de Materiais
          </h1>
          <p
            style={{
              color: '#666666',
              fontSize: '14px',
              margin: `4px 0 0 0`,
            }}
          >
            SKUs, saldos, localizações e status de cada item em tempo real.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            onClick={() => {
              reloadInventoryData();
              onRefresh?.();
            }}
            style={secondaryBtnStyle}
            aria-label="Atualizar"
          >
            <RefreshCw size={14} /> Atualizar
          </Button>
          <Button onClick={handleExportCsv} style={secondaryBtnStyle} aria-label="Exportar CSV">
            <FileDown size={14} /> Exportar
          </Button>
          {onOpenMovements && (
            <Button onClick={onOpenMovements} style={secondaryBtnStyle}>
              <Tag size={14} /> Movimentações
            </Button>
          )}
          {onCreate && (
            <Button onClick={onCreate} style={primaryBtnStyle}>
              <Plus size={16} /> Novo Material
            </Button>
          )}
          {onEntry && (
            <Button
              onClick={() => {
                const firstLow = sorted.find((s) => s.status !== 'em_estoque');
                if (firstLow) onEntry(firstLow.material);
                else
                  toastError(
                    'Sem itens para reposição',
                    'Todos os materiais estão com estoque OK.',
                  );
              }}
              style={{
                ...primaryBtnStyle,
                background: '#28A745',
                boxShadow: `0 4px 12px #28A74540`,
              }}
            >
              <ArrowDownCircle size={16} /> + Entrada
            </Button>
          )}
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        {[
          { key: 'em_estoque' as StockStatus, label: 'EM ESTOQUE' },
          { key: 'baixo' as StockStatus, label: 'BAIXO' },
          { key: 'fora' as StockStatus, label: 'FORA DE ESTOQUE' },
        ].map(({ key, label }) => {
          const meta = STATUS_META[key];
          const active = statusFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(active ? 'all' : key)}
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
                  {label}
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#1A1A1A',
                    lineHeight: 1.1,
                  }}
                >
                  {metrics.totals[key]}
                </div>
              </div>
            </button>
          );
        })}
        <div
          style={{
            background: '#FFFFFF',
            border: `1px solid #E0E0E0`,
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
              background: '#F0F7FF',
              color: '#0D5FB8',
            }}
          >
            <Tag size={16} />
          </span>
          <div>
            <div
              style={{
                fontSize: '11px',
                color: '#666666',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Valor em Estoque
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#1A1A1A',
                lineHeight: 1.1,
              }}
            >
              {formatCurrency(metrics.totalValue)}
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
              placeholder="Buscar por SKU, nome ou descrição…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Buscar materiais"
              style={inputStyle}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por categoria"
            style={inputStyle}
          >
            <option value="all">Todas Categorias</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            aria-label="Filtrar por status"
            style={inputStyle}
          >
            <option value="all">Todos Status</option>
            <option value="em_estoque">Em Estoque</option>
            <option value="baixo">Baixo</option>
            <option value="fora">Fora de Estoque</option>
          </select>

          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por localização"
            style={inputStyle}
          >
            <option value="all">Todas Localizações</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

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
            aria-label="Lista de materiais em estoque"
          >
            <thead>
              <tr
                style={{
                  background: '#FAFAFA',
                  borderBottom: `2px solid #E0E0E0`,
                }}
              >
                <SortHeader k="sku" label="SKU" />
                <SortHeader k="nome" label="Material" />
                <SortHeader k="categoria" label="Categoria" />
                <SortHeader k="quantidade" label="Quantidade" align="right" />
                <SortHeader k="localizacao" label="Localização" />
                <SortHeader k="status" label="Status" />
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
                    colSpan={7}
                    style={{
                      padding: '48px',
                      textAlign: 'center',
                      color: '#666666',
                    }}
                  >
                    Carregando materiais…
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: '48px',
                      textAlign: 'center',
                      color: '#666666',
                    }}
                  >
                    <Package
                      size={32}
                      style={{ opacity: 0.3, margin: '0 auto', display: 'block' }}
                    />
                    <p style={{ margin: `8px 0 0 0` }}>
                      {hasActiveFilter
                        ? 'Nenhum material encontrado com os filtros atuais.'
                        : 'Nenhum material cadastrado.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map(({ material, status, categoria, localizacao }) => {
                  const meta = STATUS_META[status];
                  const estoqueAtual = Number(material.estoque_atual || 0);
                  const estoqueMin = Number(material.estoque_minimo || 0);
                  return (
                    <tr key={material.id} style={{ borderBottom: `1px solid #E0E0E0` }}>
                      <td style={{ padding: '16px' }}>
                        <div
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#0D5FB8',
                            fontSize: '12px',
                          }}
                        >
                          {material.sku || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: '#1A1A1A',
                          }}
                        >
                          {material.nome || 'Sem nome'}
                        </div>
                        {material.marca && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#666666',
                              marginTop: 2,
                            }}
                          >
                            {material.marca}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          color: '#666666',
                        }}
                      >
                        {categoria?.nome || '—'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: '#1A1A1A',
                          }}
                        >
                          {estoqueAtual.toLocaleString('pt-BR')}{' '}
                          <span
                            style={{
                              fontWeight: 400,
                              color: '#666666',
                              fontSize: '11px',
                            }}
                          >
                            {material.unidade_compra}
                          </span>
                        </div>
                        {estoqueMin > 0 && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#666666',
                              marginTop: 2,
                            }}
                          >
                            mín: {estoqueMin}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          color: '#666666',
                          fontSize: '12px',
                        }}
                      >
                        {localizacao ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} /> {localizacao}
                          </span>
                        ) : (
                          <span style={{ color: '#CCCCCC' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
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
                          }}
                        >
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div
                          className="ds-row-actions"
                          style={{ display: 'inline-flex', gap: '4px' }}
                        >
                          {onEntry && (
                            <button
                              type="button"
                              onClick={() => onEntry(material)}
                              aria-label={`Registrar entrada de ${material.nome}`}
                              title="Registrar entrada"
                              style={iconBtn('#28A745', '#E6F4EA', '#A8D5B6')}
                            >
                              <ArrowDownCircle size={12} />
                            </button>
                          )}
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(material)}
                              aria-label={`Editar ${material.nome}`}
                              title="Editar"
                              style={iconBtn('#0D5FB8', '#F0F7FF', '#E0EFFF')}
                            >
                              <Edit3 size={12} />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                onDelete ? onDelete(material) : handleDelete(material)
                              }
                              aria-label={`Excluir ${material.nome}`}
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
      </section>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
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
};

const primaryBtnStyle: React.CSSProperties = {
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
  cursor: 'pointer',
  boxShadow: `0 4px 12px #0D66CC40`,
};

const secondaryBtnStyle: React.CSSProperties = {
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

export default StockList;
