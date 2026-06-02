import React, { useMemo, useState } from 'react';
import { Plus, Search, Edit3, Trash2, ChevronUp, ChevronDown, MessageCircle } from 'lucide-react';
import { designSystem } from '@/styles/design-system';
import { Button } from '../../components/common';
import type { Client } from '../../types/entities';

type SortKey = 'nome' | 'cidade' | 'status' | 'projetos';
type SortDir = 'asc' | 'desc';

interface ClientListProps {
  clients: Client[];
  projectCountByName: Record<string, number>;
  onCreate: () => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

const origemLabels: Record<string, string> = {
  indicacao: 'Indicação',
  instagram: 'Instagram',
  google: 'Google',
  feira: 'Feira',
  passante: 'Passante',
  outro: 'Outro',
};

const tipoImovelIcon: Record<string, string> = {
  casa: '🏠',
  apartamento: '🏢',
  comercial: '🏭',
};

export const ClientList: React.FC<ClientListProps> = ({
  clients,
  projectCountByName,
  onCreate,
  onEdit,
  onDelete,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('nome');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filteredAndSorted = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = clients.filter((c) => {
      if (statusFilter !== 'all' && (c.status || 'ativo') !== statusFilter) return false;
      if (!term) return true;
      return (
        c.nome.toLowerCase().includes(term) ||
        (c.telefone || '').includes(term) ||
        (c.cidade || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term)
      );
    });

    list = [...list].sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      switch (sortKey) {
        case 'nome':
          va = a.nome.toLowerCase();
          vb = b.nome.toLowerCase();
          break;
        case 'cidade':
          va = (a.cidade || '').toLowerCase();
          vb = (b.cidade || '').toLowerCase();
          break;
        case 'status':
          va = a.status || 'ativo';
          vb = b.status || 'ativo';
          break;
        case 'projetos':
          va = projectCountByName[a.nome] || 0;
          vb = projectCountByName[b.nome] || 0;
          break;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [clients, search, statusFilter, sortKey, sortDir, projectCountByName]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredAndSorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortHeader: React.FC<{ k: SortKey; label: string }> = ({ k, label }) => {
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
          transition: 'color 0.15s ease',
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

  const pageStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: designSystem.spacing.xl,
    padding: designSystem.spacing.lg,
    fontFamily: designSystem.typography.fontFamily,
    color: designSystem.colors.text.primary,
  };

  const cardStyle: React.CSSProperties = {
    background: designSystem.colors.surface,
    borderRadius: designSystem.borderRadius.lg,
    boxShadow: designSystem.shadows.md,
    padding: designSystem.spacing.lg,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: designSystem.colors.surface,
    border: `1px solid ${designSystem.colors.border}`,
    borderRadius: designSystem.borderRadius.md,
    padding: `${designSystem.spacing.sm} ${designSystem.spacing.md}`,
    fontSize: designSystem.typography.fontSizes.sm,
    fontFamily: designSystem.typography.fontFamily,
    color: designSystem.colors.text.primary,
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  };

  const emptyState: React.CSSProperties = {
    padding: designSystem.spacing['2xl'],
    textAlign: 'center',
    color: designSystem.colors.text.secondary,
    fontSize: designSystem.typography.fontSizes.sm,
  };

  return (
    <div className="ds-client-list" style={pageStyle}>
      <style>{`
        .ds-client-list input:focus { border-color: ${designSystem.colors.primary[500]} !important; box-shadow: 0 0 0 3px ${designSystem.colors.primary[100]}; }
        .ds-client-list table tbody tr { transition: background-color 0.15s ease, box-shadow 0.15s ease; }
        .ds-client-list table tbody tr:hover { background: ${designSystem.colors.background}; box-shadow: ${designSystem.shadows.sm}; }
        .ds-client-list .ds-row-actions { opacity: 0.7; transition: opacity 0.15s ease; }
        .ds-client-list table tbody tr:hover .ds-row-actions { opacity: 1; }
      `}</style>

      {/* Header */}
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
            Clientes
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: designSystem.spacing.md,
              marginTop: designSystem.spacing.xs,
            }}
          >
            <p
              style={{
                color: designSystem.colors.text.secondary,
                fontSize: designSystem.typography.fontSizes.sm,
                margin: 0,
              }}
            >
              Gerencie sua base de clientes pessoa física
            </p>
            <span
              style={{
                background: designSystem.colors.primary[50],
                color: designSystem.colors.primary[600],
                padding: `${designSystem.spacing.xs} ${designSystem.spacing.sm}`,
                borderRadius: designSystem.borderRadius.full,
                fontSize: designSystem.typography.fontSizes.xs,
                fontWeight: designSystem.typography.fontWeights.semibold,
                border: `1px solid ${designSystem.colors.primary[100]}`,
              }}
            >
              {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
            </span>
          </div>
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
          <Plus size={16} />
          Novo Cliente
        </Button>
      </header>

      {/* Filters + Table */}
      <div style={cardStyle}>
        {/* Filter bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
              placeholder="Buscar por nome, telefone, cidade, e-mail…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ ...inputStyle, paddingLeft: designSystem.spacing['2xl'] }}
              aria-label="Buscar clientes"
            />
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setPage(1);
              }}
              style={{
                ...inputStyle,
                appearance: 'none',
                cursor: 'pointer',
                paddingRight: designSystem.spacing['2xl'],
              }}
              aria-label="Filtrar por status"
            >
              <option value="all">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
            <ChevronDown
              size={16}
              style={{
                position: 'absolute',
                right: designSystem.spacing.md,
                top: '50%',
                transform: 'translateY(-50%)',
                color: designSystem.colors.text.secondary,
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* Table */}
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
            aria-label="Lista de clientes"
          >
            <thead>
              <tr
                style={{
                  background: designSystem.colors.background,
                  borderBottom: `2px solid ${designSystem.colors.border}`,
                }}
              >
                <SortHeader k="nome" label="Cliente" />
                <th
                  style={{
                    padding: designSystem.spacing.md,
                    fontSize: designSystem.typography.fontSizes.xs,
                    fontWeight: designSystem.typography.fontWeights.semibold,
                    color: designSystem.colors.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Contato
                </th>
                <SortHeader k="cidade" label="Cidade/UF" />
                <th
                  style={{
                    padding: designSystem.spacing.md,
                    fontSize: designSystem.typography.fontSizes.xs,
                    fontWeight: designSystem.typography.fontWeights.semibold,
                    color: designSystem.colors.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Origem
                </th>
                <SortHeader k="projetos" label="Projetos" />
                <SortHeader k="status" label="Status" />
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
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} style={emptyState}>
                    {search || statusFilter !== 'all'
                      ? 'Nenhum cliente encontrado com os filtros atuais.'
                      : 'Nenhum cliente cadastrado.'}
                  </td>
                </tr>
              ) : (
                paginated.map((c) => {
                  const projetoCount = projectCountByName[c.nome] || 0;
                  const isActive = (c.status || 'ativo') === 'ativo';
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: `1px solid ${designSystem.colors.border}` }}
                    >
                      <td style={{ padding: designSystem.spacing.md }}>
                        <div
                          style={{
                            fontWeight: designSystem.typography.fontWeights.semibold,
                            color: designSystem.colors.text.primary,
                          }}
                        >
                          {tipoImovelIcon[c.tipoImovel || ''] || '·'} {c.nome}
                        </div>
                        <div
                          style={{
                            fontSize: designSystem.typography.fontSizes.xs,
                            color: designSystem.colors.text.secondary,
                            marginTop: 2,
                          }}
                        >
                          {c.cpf || 'CPF não informado'}
                        </div>
                      </td>
                      <td style={{ padding: designSystem.spacing.md }}>
                        {c.telefone ? (
                          <a
                            href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: designSystem.colors.success,
                              fontWeight: designSystem.typography.fontWeights.semibold,
                              fontSize: designSystem.typography.fontSizes.sm,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: designSystem.spacing.xs,
                              textDecoration: 'none',
                            }}
                          >
                            <MessageCircle size={14} />
                            {c.telefone}
                          </a>
                        ) : (
                          <span
                            style={{
                              color: designSystem.colors.text.disabled,
                              fontSize: designSystem.typography.fontSizes.sm,
                            }}
                          >
                            —
                          </span>
                        )}
                        {c.email && (
                          <div
                            style={{
                              fontSize: designSystem.typography.fontSizes.xs,
                              color: designSystem.colors.text.secondary,
                              marginTop: 2,
                            }}
                          >
                            {c.email}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: designSystem.spacing.md,
                          color: designSystem.colors.text.secondary,
                          fontSize: designSystem.typography.fontSizes.sm,
                        }}
                      >
                        {c.cidade ? `${c.cidade}/${c.uf || '—'}` : '—'}
                      </td>
                      <td style={{ padding: designSystem.spacing.md }}>
                        <span
                          style={{
                            fontSize: designSystem.typography.fontSizes.xs,
                            fontWeight: designSystem.typography.fontWeights.semibold,
                            padding: `${designSystem.spacing.xs} ${designSystem.spacing.sm}`,
                            borderRadius: designSystem.borderRadius.full,
                            background: designSystem.colors.background,
                            color: designSystem.colors.text.secondary,
                            border: `1px solid ${designSystem.colors.border}`,
                          }}
                        >
                          {origemLabels[c.origem || 'outro'] || c.origem}
                        </span>
                      </td>
                      <td style={{ padding: designSystem.spacing.md, textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: designSystem.typography.fontSizes.lg,
                            fontWeight: designSystem.typography.fontWeights.bold,
                            color:
                              projetoCount > 0
                                ? designSystem.colors.primary[600]
                                : designSystem.colors.text.disabled,
                          }}
                        >
                          {projetoCount}
                        </span>
                      </td>
                      <td style={{ padding: designSystem.spacing.md }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: `${designSystem.spacing.xs} ${designSystem.spacing.sm}`,
                            borderRadius: designSystem.borderRadius.sm,
                            fontSize: designSystem.typography.fontSizes.xs,
                            fontWeight: designSystem.typography.fontWeights.bold,
                            background: isActive ? '#E6F4EA' : '#FBE9EB',
                            color: isActive
                              ? designSystem.colors.success
                              : designSystem.colors.error,
                            border: `1px solid ${isActive ? '#A8D5B6' : '#F0A8AE'}`,
                          }}
                        >
                          {isActive ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </td>
                      <td style={{ padding: designSystem.spacing.md, textAlign: 'right' }}>
                        <div
                          className="ds-row-actions"
                          style={{ display: 'inline-flex', gap: designSystem.spacing.xs }}
                        >
                          <button
                            type="button"
                            onClick={() => onEdit(c)}
                            aria-label={`Editar ${c.nome}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: designSystem.spacing.xs,
                              padding: `${designSystem.spacing.xs} ${designSystem.spacing.sm}`,
                              background: 'transparent',
                              border: `1px solid ${designSystem.colors.primary[100]}`,
                              color: designSystem.colors.primary[600],
                              borderRadius: designSystem.borderRadius.md,
                              fontSize: designSystem.typography.fontSizes.xs,
                              fontWeight: designSystem.typography.fontWeights.semibold,
                              cursor: 'pointer',
                              fontFamily: designSystem.typography.fontFamily,
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background =
                                designSystem.colors.primary[50];
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = 'transparent';
                            }}
                          >
                            <Edit3 size={12} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(c)}
                            aria-label={`Excluir ${c.nome}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: designSystem.spacing.xs,
                              padding: `${designSystem.spacing.xs} ${designSystem.spacing.sm}`,
                              background: 'transparent',
                              border: `1px solid #F0A8AE`,
                              color: designSystem.colors.error,
                              borderRadius: designSystem.borderRadius.md,
                              fontSize: designSystem.typography.fontSizes.xs,
                              fontWeight: designSystem.typography.fontWeights.semibold,
                              cursor: 'pointer',
                              fontFamily: designSystem.typography.fontFamily,
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = '#FBE9EB';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = 'transparent';
                            }}
                          >
                            <Trash2 size={12} />
                            Excluir
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

        {/* Pagination */}
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
              style={{
                background: designSystem.colors.surface,
                color: designSystem.colors.text.primary,
                border: `1px solid ${designSystem.colors.border}`,
                borderRadius: designSystem.borderRadius.md,
                padding: `${designSystem.spacing.xs} ${designSystem.spacing.md}`,
                fontSize: designSystem.typography.fontSizes.sm,
                fontWeight: designSystem.typography.fontWeights.semibold,
                cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                opacity: safePage === 1 ? 0.5 : 1,
                fontFamily: designSystem.typography.fontFamily,
              }}
            >
              ←
            </Button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((n) => {
              const active = n === safePage;
              return (
                <Button
                  key={n}
                  onClick={() => setPage(n)}
                  style={{
                    background: active
                      ? designSystem.colors.primary[500]
                      : designSystem.colors.surface,
                    color: active ? designSystem.colors.surface : designSystem.colors.text.primary,
                    border: `1px solid ${active ? designSystem.colors.primary[500] : designSystem.colors.border}`,
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
              );
            })}
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{
                background: designSystem.colors.surface,
                color: designSystem.colors.text.primary,
                border: `1px solid ${designSystem.colors.border}`,
                borderRadius: designSystem.borderRadius.md,
                padding: `${designSystem.spacing.xs} ${designSystem.spacing.md}`,
                fontSize: designSystem.typography.fontSizes.sm,
                fontWeight: designSystem.typography.fontWeights.semibold,
                cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                opacity: safePage === totalPages ? 0.5 : 1,
                fontFamily: designSystem.typography.fontFamily,
              }}
            >
              →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientList;
