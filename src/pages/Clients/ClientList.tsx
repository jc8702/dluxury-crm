import React, { useMemo, useState } from 'react';
import { Plus, Search, Edit3, Trash2, MessageCircle } from 'lucide-react';
import { Button, Input, Select, Table, Badge, Card } from '../../components/ui';
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
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (statusFilter !== 'all' && (c.status || 'ativo') !== statusFilter) return false;
      if (!term) return true;
      return (
        c.nome.toLowerCase().includes(term) ||
        (c.telefone || '').includes(term) ||
        (c.cidade || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term)
      );
    });
  }, [clients, search, statusFilter]);

  const columns = [
    {
      key: 'nome',
      header: 'Cliente',
      sortable: true,
      render: (c: Client) => (
        <div>
          <div className="font-semibold text-[var(--ui-text-primary)]">
            {tipoImovelIcon[c.tipoImovel || '']} {c.nome}
          </div>
          <div className="text-[12px] text-[var(--ui-text-muted)] mt-0.5">
            {c.cpf || 'CPF não informado'}
          </div>
        </div>
      ),
    },
    {
      key: 'contato',
      header: 'Contato',
      render: (c: Client) => (
        <div>
          {c.telefone ? (
            <a
              href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[var(--ui-color-success)] font-semibold hover:underline"
            >
              <MessageCircle size={14} />
              {c.telefone}
            </a>
          ) : (
            <span className="text-[var(--ui-text-muted)]">—</span>
          )}
          {c.email && (
            <div className="text-[12px] text-[var(--ui-text-muted)] mt-0.5">{c.email}</div>
          )}
        </div>
      ),
    },
    {
      key: 'cidade',
      header: 'Cidade/UF',
      sortable: true,
      render: (c: Client) => (
        <span className="text-[var(--ui-text-secondary)]">
          {c.cidade ? `${c.cidade}/${c.uf || '—'}` : '—'}
        </span>
      ),
    },
    {
      key: 'origem',
      header: 'Origem',
      render: (c: Client) => (
        <Badge tone="outline">{origemLabels[c.origem || 'outro'] || c.origem}</Badge>
      ),
    },
    {
      key: 'projetos',
      header: 'Projetos',
      sortable: true,
      align: 'center' as const,
      render: (c: Client) => {
        const count = projectCountByName[c.nome] || 0;
        return (
          <span
            className={`text-lg font-bold ${count > 0 ? 'text-[var(--ui-color-primary)]' : 'text-[var(--ui-text-muted)]'}`}
          >
            {count}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (c: Client) => {
        const isActive = (c.status || 'ativo') === 'ativo';
        return (
          <Badge tone={isActive ? 'success' : 'danger'}>{isActive ? 'ATIVO' : 'INATIVO'}</Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right' as const,
      render: (c: Client) => (
        <div className="inline-flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(c);
            }}
            className="text-[var(--ui-color-primary)] hover:text-[var(--ui-color-primary)] hover:bg-[var(--ui-color-primary)]/10"
            title="Editar Cliente"
          >
            <Edit3 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(c);
            }}
            className="text-[var(--ui-color-danger)] hover:text-[var(--ui-color-danger)] hover:bg-[var(--ui-color-danger)]/10"
            title="Excluir Cliente"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in">
      {/* Header */}
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--ui-text-primary)]">Clientes</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-[var(--ui-text-secondary)]">
              Gerencie sua base de clientes pessoa física
            </p>
            <Badge tone="primary" className="font-semibold">
              {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
            </Badge>
          </div>
        </div>
        <Button onClick={onCreate} className="gap-2 shadow-[var(--ui-shadow-primary)]">
          <Plus size={16} />
          Novo Cliente
        </Button>
      </header>

      {/* Main Content */}
      <Card className="p-0 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-[var(--ui-border)] bg-[var(--ui-bg-subtle)]/30 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <Input
              placeholder="Buscar por nome, telefone, cidade, e-mail…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search size={16} />}
            />
          </div>
          <div className="w-[200px]">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Todos os status' },
                { value: 'ativo', label: 'Ativos' },
                { value: 'inativo', label: 'Inativos' },
              ]}
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="p-4">
          <Table<Client>
            columns={columns}
            data={filtered}
            rowKey={(row) => row.id!}
            emptyMessage={
              search || statusFilter !== 'all'
                ? 'Nenhum cliente encontrado com os filtros atuais.'
                : 'Nenhum cliente cadastrado.'
            }
            pagination={{
              page,
              pageSize,
              total: filtered.length,
              onPageChange: setPage,
            }}
            onRowClick={onEdit}
            className="border-none shadow-none"
          />
        </div>
      </Card>
    </div>
  );
};

export default ClientList;
