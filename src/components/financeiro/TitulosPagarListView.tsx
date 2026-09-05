import React from 'react';
import { Button, Modal, Input } from '../common';
import {
  Plus,
  CheckCircle,
  Trash2,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  Edit2,
  Printer,
  CheckSquare,
  Layers,
  ArrowLeft,
  FileText,
  X,
} from 'lucide-react';
import { TableSkeleton } from '../common/Skeleton';
import FinanceiroTitulosPagarWizard from '../../pages/FinanceiroTitulosPagarWizard';
import ReciboModal from '../ReciboModal';
import type { Titulo, ContaInterna } from '../../modules/financeiro/domain/types';

interface Props {
  rows: any[];
  total: number;
  page: number;
  perPage: number;
  loading: boolean;
  suppliersMap: Record<string, string>;
  contas: ContaInterna[];
  expandedGroups: Record<string, boolean>;
  selectedIds: Set<string>;
  stats: { totalAberto: number; totalVencido: number; totalPago: number };
  baixaModal: any;
  editModal: any;
  reciboModal: any;
  loteModal: boolean;
  loteData: any;
  loteLoading: boolean;
  isWizardOpen: boolean;
  onPageChange: (p: number) => void;
  onRefresh: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onToggleSelect: (id: string) => void;
  onToggleGroup: (sid: string) => void;
  onNewWizard: () => void;
  onEdit: (r: any) => void;
  onDelete: (id: string) => void;
  onBaixa: (r: any) => void;
  onRecibo: (r: any) => void;
  onBaixaConfirm: () => void;
  onBaixaClose: () => void;
  onEditSave: () => void;
  onEditClose: () => void;
  onEditChange: (r: any) => void;
  onReciboClose: () => void;
  onLoteOpen: () => void;
  onLoteClose: () => void;
  onLoteDataChange: (d: any) => void;
  onLoteConfirm: () => void;
  onWizardClose: () => void;
  onDeleteBatch: (sid: string) => void;
}

export function TitulosPagarListView({
  rows,
  total,
  page,
  perPage,
  loading,
  suppliersMap,
  contas,
  expandedGroups,
  selectedIds,
  stats,
  baixaModal,
  editModal,
  reciboModal,
  loteModal,
  loteData,
  loteLoading,
  isWizardOpen,
  onPageChange,
  onRefresh,
  onSelectAll,
  onClearSelection,
  onToggleSelect,
  onToggleGroup,
  onNewWizard,
  onEdit,
  onDelete,
  onBaixa,
  onRecibo,
  onBaixaConfirm,
  onBaixaClose,
  onEditSave,
  onEditClose,
  onEditChange,
  onReciboClose,
  onLoteOpen,
  onLoteClose,
  onLoteDataChange,
  onLoteConfirm,
  onWizardClose,
  onDeleteBatch,
}: Props) {
  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
      <Button
        variant="ghost"
        onClick={() => (window.location.hash = '#/financeiro')}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4 p-0 h-auto hover:bg-transparent"
      >
        <ArrowLeft size={16} /> Voltar ao Painel Financeiro
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-[var(--ui-text-2xl)] font-semibold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-3">
            <ArrowUpRight className="text-[hsl(var(--destructive))] w-5 h-5" /> Títulos a Pagar
          </h1>
          <p className="mt-0.5 text-[var(--ui-text-sm)] text-[var(--ui-text-secondary)]">
            Gestão Industrial de Saídas & Compromissos
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedIds.size > 0 && (
            <Button
              variant="primary"
              size="md"
              className="italic tracking-widest font-black text-[11px] bg-[hsl(38_92%_35%)] hover:bg-[hsl(38_92%_30%)] text-white shadow-lg shadow-[hsl(38_92%_35%)]/20"
              onClick={onLoteOpen}
            >
              <Layers className="w-4 h-4" /> PAGAR {selectedIds.size} EM LOTE
            </Button>
          )}
          <Button
            variant="outline"
            size="md"
            className="italic tracking-widest font-black text-[11px] text-foreground border-border/20 hover:bg-muted"
            onClick={onSelectAll}
          >
            <CheckSquare className="w-4 h-4" /> SELECIONAR ABERTOS
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="md"
              className="italic font-black text-[hsl(var(--destructive))] hover:bg-[var(--ui-color-danger-soft)] border-[hsl(var(--destructive)/0.3)] transition-all uppercase"
              onClick={onClearSelection}
            >
              LIMPAR ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="danger"
            size="md"
            className="italic tracking-widest font-black text-[11px] bg-[hsl(var(--destructive))] border-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.9)] shadow-lg shadow-[hsl(var(--destructive)/0.2)]"
            onClick={onNewWizard}
          >
            <Plus className="w-4 h-4" /> NOVO PAGAMENTO
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          {
            label: 'Total a Pagar',
            value: stats.totalAberto,
            color: 'text-[hsl(var(--destructive))]',
            bg: 'bg-[var(--ui-color-danger-soft)]',
            border: 'border-[hsl(var(--destructive)/0.2)]',
            icon: ArrowUpRight,
          },
          {
            label: 'Total Pago',
            value: stats.totalPago,
            color: 'text-[hsl(var(--success))]',
            bg: 'bg-[var(--ui-color-success-soft)]',
            border: 'border-[hsl(var(--success)/0.2)]',
            icon: CheckCircle,
          },
          {
            label: 'Total Vencido',
            value: stats.totalVencido,
            color: 'text-[hsl(var(--destructive))]',
            bg: 'bg-[hsl(var(--destructive)/0.08)]',
            border: 'border-[hsl(var(--destructive)/0.3)]',
            icon: Calendar,
          },
        ].map((stat, i) => (
          <div
            key={i}
            className={`glass p-6 rounded-2xl border ${stat.border} ${stat.bg} relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold text-[var(--ui-text-secondary)] uppercase tracking-wider group-hover:text-foreground transition-colors">
                {stat.label}
              </span>
              <stat.icon
                className={`w-5 h-5 ${stat.color} opacity-80 group-hover:scale-110 transition-transform`}
              />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              R$ {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div
              className={`absolute -right-4 -bottom-4 w-24 h-24 ${stat.color} opacity-5 blur-3xl rounded-full group-hover:opacity-10 transition-opacity`}
            />
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl border border-border/40 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="w-12 px-6 py-5">
                  <div className="flex items-center justify-center">
                    <button
                      onClick={onSelectAll}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                  </div>
                </th>
                <th className="text-left px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                  Identificação
                </th>
                <th className="text-left px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                  Status Operacional
                </th>
                <th className="text-right px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                  Valor Bruto
                </th>
                <th className="text-left px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                  Vencimento
                </th>
                <th className="text-left px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                  Badges
                </th>
                <th className="text-center px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                  Comandos
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <TableSkeleton rows={8} cols={7} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <FileText className="w-16 h-16" />
                      <p className="text-xs font-black uppercase tracking-[0.4em]">
                        Nenhum compromisso industrial registrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                Object.entries(
                  rows.reduce((acc: any, r: any) => {
                    const sid = r.fornecedor_id || 'unknown';
                    if (!acc[sid]) acc[sid] = [];
                    acc[sid].push(r);
                    return acc;
                  }, {}),
                ).map(([sid, groupRows]: [string, any]) => {
                  const isExpanded = expandedGroups[sid];
                  const supplierName = (
                    suppliersMap[sid] || 'FORNECEDOR NÃO IDENTIFICADO'
                  ).toUpperCase();
                  const totalGroup = groupRows.reduce(
                    (sum: number, r: any) => sum + Number(r.valor_original),
                    0,
                  );

                  return (
                    <React.Fragment key={sid}>
                      <tr
                        onClick={() => onToggleGroup(sid)}
                        className="bg-muted/20 cursor-pointer hover:bg-muted/40 transition-all border-l-4 border-[hsl(var(--destructive))] group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-primary" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                            )}
                          </div>
                        </td>
                        <td colSpan={2} className="px-4 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--ui-color-danger-soft)] border border-[hsl(var(--destructive)/0.2)] flex items-center justify-center text-[hsl(var(--destructive))] font-black italic">
                              {supplierName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-black text-foreground italic tracking-tight uppercase">
                                {supplierName}
                              </div>
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                {groupRows.length} Títulos Industriais
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right px-4 py-4">
                          <div className="text-lg font-black text-[hsl(var(--destructive))] italic tracking-tighter">
                            R$ {totalGroup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td colSpan={3} className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] font-black text-[hsl(var(--destructive))] hover:bg-[var(--ui-color-danger-soft)] border-[hsl(var(--destructive)/0.3)] transition-all uppercase italic flex items-center gap-2 ml-auto"
                            onClick={(e: any) => {
                              e.stopPropagation();
                              onDeleteBatch(sid);
                            }}
                          >
                            <Trash2 className="w-3 h-3" /> EXCLUIR LOTE
                          </Button>
                        </td>
                      </tr>
                      {isExpanded &&
                        groupRows.map((r: any) => {
                          const isSelected = selectedIds.has(r.id);
                          return (
                            <tr
                              key={r.id}
                              className={`hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleSelect(r.id);
                                    }}
                                    className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border text-transparent hover:border-primary/50'}`}
                                  >
                                    <CheckSquare className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-4 font-mono text-xs font-black text-[hsl(var(--destructive))] tracking-widest italic">
                                {r.numero_titulo}
                              </td>
                              <td className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase italic tracking-widest">
                                Compromisso Individual
                              </td>
                              <td className="text-right px-4 py-4 font-black text-foreground italic tracking-tighter">
                                R${' '}
                                {Number(r.valor_original).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider italic">
                                  <Calendar className="w-3.5 h-3.5 opacity-50 text-primary" />
                                  {new Date(r.data_vencimento).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest italic ${r.status === 'pago' ? 'bg-[var(--ui-color-success-soft)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.2)]' : new Date(r.data_vencimento) < new Date() ? 'bg-[var(--ui-color-danger-soft)] text-[hsl(var(--destructive))] border border-[hsl(var(--destructive)/0.2)]' : 'bg-[var(--ui-color-warning-soft)] text-[hsl(38_92%_35%)] border border-[hsl(var(--warning)/0.2)]'}`}
                                >
                                  {r.status === 'pago'
                                    ? 'LIQUIDADO'
                                    : new Date(r.data_vencimento) < new Date()
                                      ? 'ATRASADO'
                                      : 'PENDENTE'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-2.5 rounded-xl border border-border"
                                    onClick={() => onEdit(r)}
                                    title="Manutenção"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className={`p-2.5 rounded-xl transition-all ${r.status === 'pago' ? 'opacity-20 cursor-not-allowed text-muted-foreground' : 'bg-[var(--ui-color-success-soft)] border border-[hsl(var(--success)/0.2)] text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.2)]'}`}
                                    onClick={() => r.status !== 'pago' && onBaixa(r)}
                                    disabled={r.status === 'pago'}
                                    title="Efetivar Pagamento"
                                  >
                                    <ArrowUpRight className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    className="p-2.5 rounded-xl bg-[var(--ui-color-danger-soft)] border border-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] hover:bg-[var(--ui-color-danger-soft)] transition-all"
                                    onClick={() => onDelete(r.id)}
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-primary hover:bg-primary/20 transition-all"
                                    onClick={() => onRecibo(r)}
                                    title="Imprimir Comprovante"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
          <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic">
            <div>
              Exibindo <span className="text-foreground">{rows.length}</span> de{' '}
              <span className="text-foreground">{total}</span> compromissos operacionais
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-lg disabled:opacity-20 hover:text-primary transition-colors uppercase font-black italic text-foreground"
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-lg disabled:opacity-20 hover:text-primary transition-colors uppercase font-black italic text-foreground"
                disabled={page * perPage >= total}
                onClick={() => onPageChange(page + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ReciboModal
        isOpen={!!reciboModal}
        onClose={onReciboClose}
        titulo={reciboModal as any}
        tipo="pagar"
        beneficiarioOuPagador={
          reciboModal ? suppliersMap[reciboModal.fornecedor_id] || 'Fornecedor' : ''
        }
      />

      {isWizardOpen && (
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-[2px] flex justify-end items-center z-[9999] animate-fade-in"
          onClick={onWizardClose}
        >
          <div
            className="bg-card border border-border shadow-2xl rounded-l-2xl h-screen w-full max-w-[650px] flex flex-col overflow-hidden animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-primary/5">
              <h2 className="text-lg font-bold text-foreground">
                Novo Lançamento - Contas a Pagar
              </h2>
              <button
                onClick={onWizardClose}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-muted/30">
              <FinanceiroTitulosPagarWizard
                isDrawer={true}
                onClose={onWizardClose}
                onSuccess={onRefresh}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
