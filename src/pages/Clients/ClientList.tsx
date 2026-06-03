import React, { useMemo, useState } from 'react';
import { Plus, Search, Edit3, Trash2, ChevronUp, ChevronDown, MessageCircle } from 'lucide-react';
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
          padding: '16px',
          fontSize: '12px',
          fontWeight: 600,
          color: active ? '#0D5FB8' : '#666666',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          transition: 'color 0.15s ease',
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

  const pageStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    padding: '24px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: '#1A1A1A',
  };

  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '24px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#FFFFFF',
    border: `1px solid #E0E0E0`,
    borderRadius: '8px',
    padding: `8px 16px`,
    fontSize: '14px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: '#1A1A1A',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  };

  const emptyState: React.CSSProperties = {
    padding: '48px',
    textAlign: 'center',
    color: '#666666',
    fontSize: '14px',
  };

  return (
    <div className="ds-client-list" style={pageStyle}>
      <style>{`
        .ds-client-list input:focus { border-color: #0D66CC !important; box-shadow: 0 0 0 3px #E0EFFF; }
        .ds-client-list table tbody tr { transition: background-color 0.15s ease, box-shadow 0.15s ease; }
        .ds-client-list table tbody tr:hover { background: #FAFAFA; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
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
            }}
          >
            Clientes
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginTop: '4px',
            }}
          >
            <p
              style={{
                color: '#666666',
                fontSize: '14px',
                margin: 0,
              }}
            >
              Gerencie sua base de clientes pessoa física
            </p>
            <span
              style={{
                background: '#F0F7FF',
                color: '#0D5FB8',
                padding: `4px 8px`,
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                border: `1px solid #E0EFFF`,
              }}
            >
              {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
            </span>
          </div>
        </div>
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
              placeholder="Buscar por nome, telefone, cidade, e-mail…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ ...inputStyle, paddingLeft: '48px' }}
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
                paddingRight: '48px',
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
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#666666',
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
            aria-label="Lista de clientes"
          >
            <thead>
              <tr
                style={{
                  background: '#FAFAFA',
                  borderBottom: `2px solid #E0E0E0`,
                }}
              >
                <SortHeader k="nome" label="Cliente" />
                <th
                  style={{
                    padding: '16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#666666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Contato
                </th>
                <SortHeader k="cidade" label="Cidade/UF" />
                <th
                  style={{
                    padding: '16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#666666',
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
                    <tr key={c.id} style={{ borderBottom: `1px solid #E0E0E0` }}>
                      <td style={{ padding: '16px' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: '#1A1A1A',
                          }}
                        >
                          {tipoImovelIcon[c.tipoImovel || ''] || '·'} {c.nome}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#666666',
                            marginTop: 2,
                          }}
                        >
                          {c.cpf || 'CPF não informado'}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {c.telefone ? (
                          <a
                            href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: '#28A745',
                              fontWeight: 600,
                              fontSize: '14px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              textDecoration: 'none',
                            }}
                          >
                            <MessageCircle size={14} />
                            {c.telefone}
                          </a>
                        ) : (
                          <span
                            style={{
                              color: '#CCCCCC',
                              fontSize: '14px',
                            }}
                          >
                            —
                          </span>
                        )}
                        {c.email && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#666666',
                              marginTop: 2,
                            }}
                          >
                            {c.email}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          color: '#666666',
                          fontSize: '14px',
                        }}
                      >
                        {c.cidade ? `${c.cidade}/${c.uf || '—'}` : '—'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: `4px 8px`,
                            borderRadius: '9999px',
                            background: '#FAFAFA',
                            color: '#666666',
                            border: `1px solid #E0E0E0`,
                          }}
                        >
                          {origemLabels[c.origem || 'outro'] || c.origem}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: projetoCount > 0 ? '#0D5FB8' : '#CCCCCC',
                          }}
                        >
                          {projetoCount}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: `4px 8px`,
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: isActive ? '#E6F4EA' : '#FBE9EB',
                            color: isActive ? '#28A745' : '#DC3545',
                            border: `1px solid ${isActive ? '#A8D5B6' : '#F0A8AE'}`,
                          }}
                        >
                          {isActive ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div
                          className="ds-row-actions"
                          style={{ display: 'inline-flex', gap: '4px' }}
                        >
                          <button
                            type="button"
                            onClick={() => onEdit(c)}
                            aria-label={`Editar ${c.nome}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: `4px 8px`,
                              background: 'transparent',
                              border: `1px solid #E0EFFF`,
                              color: '#0D5FB8',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = '#F0F7FF';
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
                              gap: '4px',
                              padding: `4px 8px`,
                              background: 'transparent',
                              border: `1px solid #F0A8AE`,
                              color: '#DC3545',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
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
              gap: '4px',
              marginTop: '24px',
            }}
          >
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{
                background: '#FFFFFF',
                color: '#1A1A1A',
                border: `1px solid #E0E0E0`,
                borderRadius: '8px',
                padding: `4px 16px`,
                fontSize: '14px',
                fontWeight: 600,
                cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                opacity: safePage === 1 ? 0.5 : 1,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
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
                    background: active ? '#0D66CC' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#1A1A1A',
                    border: `1px solid ${active ? '#0D66CC' : '#E0E0E0'}`,
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
              );
            })}
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{
                background: '#FFFFFF',
                color: '#1A1A1A',
                border: `1px solid #E0E0E0`,
                borderRadius: '8px',
                padding: `4px 16px`,
                fontSize: '14px',
                fontWeight: 600,
                cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                opacity: safePage === totalPages ? 0.5 : 1,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
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
