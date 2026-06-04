import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardStat,
  Button,
  Input,
  Select,
  Badge,
  Table,
  ConfirmDialog,
} from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Layers,
  CheckCircle2,
  FileDown,
  Search,
  ArrowLeft,
  Save,
  Pencil,
  Calculator,
  TrendingUp,
  Clock,
  CheckCheck,
  XCircle,
} from 'lucide-react';
import { useQuotation } from '../hooks/useQuotation';
import { ImportarProjeto } from '../components/ImportarProjeto';
import { ModalEnviarCliente } from '../components/ModalEnviarCliente';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { ItemCard } from '../components/ItemCard';
import ContratoDigitalModal from '@/components/contrato/ContratoDigitalModal';

const STATUS_TONE: Record<string, 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  RASCUNHO: 'neutral',
  ENVIADO: 'info',
  NEGOCIACAO: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
  EXPIRADO: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADO: 'Enviado',
  NEGOCIACAO: 'Negociação',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
  EXPIRADO: 'Expirado',
};

function formatDate(value: string | number | Date | undefined | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

function statusBadge(status: string | undefined) {
  const s = (status || 'RASCUNHO').toUpperCase();
  const tone = STATUS_TONE[s] ?? 'neutral';
  return <Badge tone={tone}>{STATUS_LABEL[s] ?? s}</Badge>;
}

export default function QuotationForm() {
  const { error: toastError, success: toastSuccess } = useToast();
  const urlParams = new URLSearchParams(window.location.search);
  const orcamentoId = urlParams.get('id');

  const {
    orcamento,
    loading,
    inicializar,
    setHeader,
    addItem,
    importItems,
    updateItem,
    removerItem,
    applyGlobalMargin,
    deletarOrcamento,
    error,
    carregar,
  } = useQuotation(orcamentoId || undefined);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isEditingAll, setIsEditingAll] = useState<boolean | undefined>(undefined);
  const [clients, setClients] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [orcamentosRecentes, setOrcamentosRecentes] = useState<any[]>([]);

  const [localComercial, setLocalComercial] = useState({
    margemLucroPercentual: 0,
    taxaFinanceiraPercentual: 0,
    validadeDias: 0,
    clienteId: '',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 1,
    limit: 5,
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (orcamento) {
      setLocalComercial({
        margemLucroPercentual: Number(orcamento.margemLucroPercentual) || 0,
        taxaFinanceiraPercentual: Number(orcamento.taxaFinanceiraPercentual) || 0,
        validadeDias: Number(orcamento.validadeDias) || 0,
        clienteId: orcamento.clienteId || '',
      });
    }
  }, [orcamento]);

  const fetchRecentes = useCallback(async () => {
    try {
      const token = localStorage.getItem('dluxury_token') || '';
      const res = await fetch(
        `/api/quotations?page=${pagination.page}&limit=${pagination.limit}&q=${searchQuery}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const result = await res.json();
      if (result.success) {
        setOrcamentosRecentes(result.data);
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error('Erro ao carregar orçamentos:', err);
    }
  }, [pagination.page, pagination.limit, searchQuery]);

  useEffect(() => {
    api.clients.list().then(setClients).catch(console.error);
    api.engineering.list().then(setSkus).catch(console.error);

    fetchRecentes();

    const isImporting = urlParams.get('import') === 'true';
    if (isImporting && orcamentoId) {
      setIsImportModalOpen(true);
      const newUrl = window.location.pathname + window.location.hash;
      const cleanUrl = orcamentoId ? `${newUrl}?id=${orcamentoId}` : newUrl;
      window.history.replaceState({}, '', cleanUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentoId]);

  useEffect(() => {
    if (searchTerm.length > 2) {
      const timer = setTimeout(() => {
        api.engineering.list({ q: searchTerm }).then(setSkus).catch(console.error);
      }, 300);
      return () => clearTimeout(timer);
    } else if (searchTerm.length === 0) {
      api.engineering.list().then(setSkus).catch(console.error);
    }
  }, [searchTerm]);

  const handleUpdateHeader = async (updates: any) => {
    await setHeader(updates);
    fetchRecentes();
  };

  const handleCreateDraft = async () => {
    try {
      const res = await inicializar({
        clienteId: null,
        margemLucroPercentual: 30,
        validadeDias: 15,
      });
      window.location.href = `?id=${res.id}#/orcamentos`;
    } catch (_err) {
      toastError('Erro ao criar rascunho');
    }
  };

  const handleCreateAndImport = async () => {
    try {
      const res = await inicializar({
        clienteId: null,
        margemLucroPercentual: 30,
        validadeDias: 15,
      });
      window.location.href = `?id=${res.id}&import=true#/orcamentos`;
    } catch (_err) {
      window.location.href = `?id=${res.id}&import=true#/orcamentos`;
    }
  };

  const handleDelete = async (orc: any) => {
    console.log('[DEBUG] handleDelete called', orc?.id);
    setPendingDelete(orc);
    console.log('[DEBUG] pendingDelete set');
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      const success = await deletarOrcamento(pendingDelete.id);
      if (success) {
        toastSuccess('Orçamento excluído com sucesso');
        fetchRecentes();
      }
    } catch (_err) {
      toastError('Erro ao excluir orçamento');
    } finally {
      setPendingDelete(null);
    }
  };

  const totais = orcamentosRecentes.reduce(
    (acc, o) => {
      acc.total += 1;
      if (o.status === 'RASCUNHO' || o.status === 'ENVIADO' || o.status === 'NEGOCIACAO') {
        acc.aguardando += 1;
      }
      if (o.status === 'APROVADO') acc.aprovados += 1;
      if (o.status === 'REJEITADO') acc.rejeitados += 1;
      return acc;
    },
    { total: 0, aguardando: 0, aprovados: 0, rejeitados: 0 },
  );

  if (loading && !orcamento) {
    return (
      <div className="min-h-screen bg-[var(--ui-bg-app)] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[var(--ui-color-teal-500)]/20 border-t-[var(--ui-color-teal-500)] rounded-full animate-spin" />
        <p className="text-[var(--ui-text-secondary)] font-medium animate-pulse">
          Sincronizando com o Servidor...
        </p>
      </div>
    );
  }

  if (error && !orcamento) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-[var(--ui-color-danger-soft)] p-6 rounded-[var(--ui-radius-lg)] mb-6">
          <XCircle className="text-[var(--ui-color-danger)] mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-semibold text-[var(--ui-text-primary)] mb-2">
            Erro ao carregar orçamento
          </h2>
          <p className="text-[var(--ui-text-secondary)] mb-8 max-w-md">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => (window.location.href = '#/orcamentos')}>
              Voltar para Lista
            </Button>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const recentColumns: Column<any>[] = [
    {
      key: 'numeroOrcamento',
      header: 'Número',
      render: (o) => (
        <span className="font-semibold text-[var(--ui-text-primary)]">{o.numeroOrcamento}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Data de Criação',
      render: (o) => (
        <span className="text-[var(--ui-text-secondary)]">{formatDate(o.createdAt || o.dataOrcamento)}</span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Data de Revisão',
      render: (o) => (
        <span className="text-[var(--ui-text-secondary)]">{formatDate(o.updatedAt)}</span>
      ),
    },
    {
      key: 'revisao',
      header: 'Revisão',
      align: 'center',
      render: (o) => <Badge tone="outline">{o.revisao || 'Rev 01'}</Badge>,
    },
    {
      key: 'usuarioId',
      header: 'Criado por',
      render: (o) => (
        <span className="text-[var(--ui-text-secondary)]">
          {o.usuarioId ? 'Usuário do Sistema' : 'Sistema'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => statusBadge(o.status),
    },
    {
      key: 'acoes',
      header: 'Ações',
      align: 'right',
      render: (o) => (
        <div className="inline-flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/api/orcamentos/export-pdf?id=${o.id}`, '_blank');
            }}
            aria-label="Visualizar PDF"
            title="Visualizar PDF"
          >
            <FileDown size={16} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(o);
            }}
            aria-label="Excluir"
            title="Excluir"
          >
            <Trash2 size={16} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.href = `?id=${o.id}#/orcamentos`;
            }}
          >
            Editar
          </Button>
        </div>
      ),
    },
  ];

  if (!orcamentoId && !orcamento) {
    return (
      <div className="min-h-screen bg-[var(--ui-bg-app)] text-[var(--ui-text-primary)] p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="flex flex-wrap justify-between items-end gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-[var(--ui-text-primary)]">
                Orçamentos <span className="text-[var(--ui-color-teal-500)]">PRO</span>
              </h1>
              <p className="text-[var(--ui-text-secondary)] mt-2">
                Gestão de orçamentos industriais e cálculos de engenharia.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="lg" leftIcon={<Plus size={18} />} onClick={handleCreateDraft}>
                Novo Orçamento
              </Button>
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Upload size={18} />}
                onClick={handleCreateAndImport}
              >
                Importar Projeto
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardStat
              label="Total de Orçamentos"
              value={totais.total}
              icon={<Calculator size={18} />}
              tone="default"
            />
            <CardStat
              label="Aguardando Aprovação"
              value={totais.aguardando}
              icon={<Clock size={18} />}
              tone="info"
            />
            <CardStat
              label="Aprovados"
              value={totais.aprovados}
              icon={<CheckCheck size={18} />}
              tone="success"
            />
            <CardStat
              label="Rejeitados"
              value={totais.rejeitados}
              icon={<XCircle size={18} />}
              tone="danger"
            />
          </div>

          <Card padding="none">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText size={16} className="text-[var(--ui-color-teal-500)]" />
                  Últimos Orçamentos
                </CardTitle>
                <Input
                  size="sm"
                  leftIcon={<Search size={14} />}
                  placeholder="BUSCAR NÚMERO..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[var(--ui-text-secondary)] bg-[var(--ui-bg-subtle)] px-3 py-1 rounded-[var(--ui-radius-full)] border border-[var(--ui-border)]">
                  {pagination.total} TOTAL
                </span>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <Table
                columns={recentColumns}
                data={orcamentosRecentes}
                rowKey={(o) => o.id}
                emptyMessage="Nenhum orçamento encontrado."
                pagination={{
                  page: pagination.page,
                  pageSize: pagination.limit,
                  total: pagination.total,
                  onPageChange: (page) => setPagination((p) => ({ ...p, page })),
                }}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ui-bg-app)] text-[var(--ui-text-primary)] p-6 lg:p-8 pb-32">
      <header className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              window.location.href = `#/orcamentos`;
            }}
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-[var(--ui-text-primary)] flex flex-wrap items-center gap-2">
              <span>Orçamento</span>
              <span className="text-[var(--ui-color-teal-500)]">
                {orcamento?.numeroOrcamento || '...'}
              </span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[var(--ui-text-secondary)] text-sm">Status:</span>
              <Select
                size="sm"
                value={(orcamento?.status || 'RASCUNHO').toLowerCase()}
                onChange={(e) => handleUpdateHeader({ status: e.target.value.toUpperCase() })}
                options={[
                  { value: 'rascunho', label: 'Rascunho' },
                  { value: 'negociacao', label: 'Negociação' },
                  { value: 'enviado', label: 'Enviado' },
                  { value: 'aprovado', label: 'Aprovado' },
                  { value: 'rejeitado', label: 'Rejeitado' },
                ]}
                className="w-[160px]"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            leftIcon={<FileDown size={16} />}
            onClick={() => window.open(`/api/orcamentos/export-pdf?id=${orcamento.id}`, '_blank')}
          >
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            leftIcon={<Upload size={16} />}
            onClick={() => setIsImportModalOpen(true)}
          >
            Importar Projeto
          </Button>
          <Button
            variant="outline"
            leftIcon={<FileText size={16} />}
            onClick={() => setIsContractModalOpen(true)}
          >
            Contrato & Assinatura
          </Button>
          <Button
            variant="outline"
            leftIcon={<Save size={16} />}
            onClick={async () => {
              await handleUpdateHeader({ status: 'RASCUNHO' });
              toastSuccess('Proposta salva como rascunho com sucesso!');
            }}
          >
            Salvar Proposta
          </Button>
          <Button
            variant="primary"
            leftIcon={<CheckCircle2 size={16} />}
            onClick={() => setIsSendModalOpen(true)}
          >
            Enviar para Cliente
          </Button>
        </div>
      </header>

      <div className="space-y-6">
        <Card padding="none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText size={16} className="text-[var(--ui-color-teal-500)]" />
              Configurações Comerciais
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="Cliente"
                size="lg"
                value={localComercial.clienteId}
                onChange={(e) => {
                  setLocalComercial({ ...localComercial, clienteId: e.target.value });
                  handleUpdateHeader({ clienteId: e.target.value });
                }}
                placeholder="Selecione um cliente..."
                options={clients.map((c) => ({ value: c.id, label: c.nome }))}
              />
              <Input
                label="Margem de Lucro (%)"
                type="number"
                size="lg"
                value={localComercial.margemLucroPercentual}
                onChange={(e) =>
                  setLocalComercial({
                    ...localComercial,
                    margemLucroPercentual: parseFloat(e.target.value) || 0,
                  })
                }
                rightIcon={
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={async () => {
                      try {
                        const res = await applyGlobalMargin(localComercial.margemLucroPercentual);
                        toastSuccess(res.message);
                      } catch (err: any) {
                        toastError('Erro', err.message);
                      }
                    }}
                  >
                    Aplicar
                  </Button>
                }
              />
              <Input
                label="Taxa Financeira (%)"
                type="number"
                size="lg"
                value={localComercial.taxaFinanceiraPercentual}
                onChange={(e) =>
                  setLocalComercial({
                    ...localComercial,
                    taxaFinanceiraPercentual: parseFloat(e.target.value) || 0,
                  })
                }
                onBlur={() =>
                  handleUpdateHeader({
                    taxaFinanceiraPercentual: localComercial.taxaFinanceiraPercentual,
                  })
                }
              />
              <Input
                label="Validade (Dias)"
                type="number"
                size="lg"
                value={localComercial.validadeDias}
                onChange={(e) =>
                  setLocalComercial({
                    ...localComercial,
                    validadeDias: parseInt(e.target.value) || 0,
                  })
                }
                onBlur={() => handleUpdateHeader({ validadeDias: localComercial.validadeDias })}
              />
            </div>
          </CardBody>
        </Card>

        <div>
          <div className="flex flex-wrap justify-between items-center gap-3 px-1 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--ui-text-primary)]">
                <Layers size={18} className="text-[var(--ui-color-warning)]" />
                Itens do Projeto
              </h2>
              {orcamento?.itens && orcamento.itens.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Pencil size={14} />}
                    onClick={() => setIsEditingAll(true)}
                  >
                    Editar Todos
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Save size={14} />}
                    onClick={() => {
                      setIsEditingAll(false);
                      toastSuccess('Alterações enviadas para gravação!');
                      setTimeout(() => fetchRecentes(), 1200);
                    }}
                  >
                    Salvar Todos
                  </Button>
                </div>
              )}
            </div>

            <div className="relative w-full sm:w-96">
              <Input
                leftIcon={<Search size={16} />}
                placeholder="BUSCAR SKU DE ENGENHARIA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <div className="absolute top-full right-0 mt-2 w-full bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-[var(--ui-radius-lg)] shadow-[var(--ui-shadow-3)] z-[var(--ui-z-modal)] overflow-hidden max-h-[400px] overflow-y-auto">
                  {skus.length === 0 ? (
                    <div className="p-6 text-center text-[var(--ui-text-secondary)] text-xs italic">
                      Nenhum SKU encontrado para "{searchTerm}"
                    </div>
                  ) : (
                    skus.map((sku) => (
                      <button
                        key={`${sku.origem}-${sku.id}`}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-[var(--ui-color-teal-500)] hover:text-white transition-colors flex justify-between items-center border-b border-[var(--ui-border)] last:border-b-0 group"
                        onClick={() => {
                          addItem(sku.id, 1);
                          setSearchTerm('');
                        }}
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge tone={sku.origem === 'MODULO' ? 'primary' : 'neutral'} size="sm">
                              {sku.origem}
                            </Badge>
                            <span className="text-sm font-semibold text-[var(--ui-text-primary)] group-hover:text-white truncate">
                              {sku.nome}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--ui-text-secondary)] group-hover:text-white/80 font-mono">
                            {sku.codigo}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-medium text-[var(--ui-text-secondary)] group-hover:text-white/80 uppercase">
                            {sku.tipo}
                          </span>
                          <Plus size={14} className="text-[var(--ui-color-teal-500)] group-hover:text-white" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {!orcamento?.itens || orcamento.itens.length === 0 ? (
            <div className="border-2 border-dashed border-[var(--ui-border)] rounded-[var(--ui-radius-lg)] p-16 text-center bg-[var(--ui-bg-subtle)]/50">
              <div className="bg-[var(--ui-bg-subtle)] w-16 h-16 rounded-[var(--ui-radius-lg)] flex items-center justify-center mx-auto mb-4">
                <Layers size={32} className="text-[var(--ui-text-muted)]" />
              </div>
              <p className="text-[var(--ui-text-primary)] font-semibold uppercase tracking-wide text-sm">
                O orçamento está vazio
              </p>
              <p className="text-[var(--ui-text-secondary)] text-xs mt-2">
                Utilize a busca acima para adicionar módulos de engenharia.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {orcamento.itens.map((item: any) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onUpdate={updateItem}
                  onDelete={removerItem}
                  isEditingExternal={isEditingAll}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Card padding="none" className="mt-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp size={16} className="text-[var(--ui-color-teal-500)]" />
            Recentes
          </CardTitle>
          <Input
            size="sm"
            leftIcon={<Search size={14} />}
            placeholder="BUSCAR NÚMERO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48"
          />
        </CardHeader>
        <CardBody className="p-0">
          <Table
            columns={recentColumns}
            data={orcamentosRecentes}
            rowKey={(o) => o.id}
            emptyMessage="Nenhum orçamento encontrado."
            pagination={{
              page: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onPageChange: (page) => setPagination((p) => ({ ...p, page })),
            }}
          />
        </CardBody>
      </Card>

      <ImportarProjeto
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onAddItems={(items) => importItems(items)}
        orcamentoId={orcamentoId || ''}
      />

      <ModalEnviarCliente
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        orcamento={orcamento}
        onSave={async () => {
          await handleUpdateHeader(localComercial);
        }}
      />

      {isContractModalOpen && orcamentoId && (
        <ContratoDigitalModal
          orcamentoId={orcamentoId}
          numeroOrcamento={orcamento?.numeroOrcamento || ''}
          onClose={() => setIsContractModalOpen(false)}
          onStatusChanged={() => {
            carregar();
          }}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir orçamento"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir o orçamento #${pendingDelete.numeroOrcamento}? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmText="Excluir"
        tone="danger"
      />
    </div>
  );
}
