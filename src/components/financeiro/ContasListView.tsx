import { Button, Modal, Input } from '../common';
import {
  RefreshCw,
  Repeat,
  Lock,
  Plus,
  ArrowLeft,
  Wallet,
  Building2,
  Edit2,
  History,
  Trash2,
  ChevronRight,
  AlertCircle,
  Info,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import type { ContaInterna } from '../../modules/financeiro/domain/types';
import type { FormTransferencia } from '../../modules/financeiro/domain/types';
import type { Fechamento } from '../../modules/financeiro/domain/types';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  contas: ContaInterna[];
  loading: boolean;
  onRefresh: () => void;
  onNew: () => void;
  onEdit: (c: ContaInterna) => void;
  onDelete: (id: string, nome: string) => void;
  onExtrato: (c: ContaInterna) => void;
  onTransfer: () => void;
  onFechamento: () => void;
  showTransferencia: boolean;
  transferForm: FormTransferencia;
  transferLoading: boolean;
  transferErro: string;
  onTransferClose: () => void;
  onTransferFormChange: (f: FormTransferencia) => void;
  onTransferSubmit: () => void;
  showFechamento: boolean;
  fechamentos: Fechamento[];
  fechamentoForm: { mes: number; ano: number; status: 'fechado' | 'aberto'; observacoes: string };
  onFechamentoClose: () => void;
  onFechamentoFormChange: (f: any) => void;
  onFechamentoSave: () => void;
  onReabrirFechamento?: (f: Fechamento) => void;
}

export function ContasListView({
  contas,
  loading,
  onRefresh,
  onNew,
  onEdit,
  onDelete,
  onExtrato,
  onTransfer,
  onFechamento,
  showTransferencia,
  transferForm,
  transferLoading,
  transferErro,
  onTransferClose,
  onTransferFormChange,
  onTransferSubmit,
  showFechamento,
  fechamentos,
  fechamentoForm,
  onFechamentoClose,
  onFechamentoFormChange,
  onFechamentoSave,
  onReabrirFechamento,
}: Props) {
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => (window.location.hash = '#/financeiro')}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4 p-0 h-auto hover:bg-transparent"
      >
        <ArrowLeft size={16} /> Voltar ao Painel Financeiro
      </Button>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div>
          <h1 className="text-[var(--ui-text-2xl)] font-semibold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-3">
            <Wallet className="text-primary w-5 h-5" />
            Contas Internas
          </h1>
          <p className="mt-0.5 text-[var(--ui-text-sm)] text-[var(--ui-text-secondary)]">
            Consolidação de saldos bancários, caixas operacionais e investimentos. Gestão de
            liquidez em tempo real com auditoria de extratos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="h-12 px-6 group border-border/40 hover:bg-muted"
            onClick={onRefresh}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 transition-transform group-hover:rotate-180 ${loading ? 'animate-spin' : ''}`}
            />{' '}
            ATUALIZAR
          </Button>
          <Button
            variant="outline"
            className="h-12 px-6 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            onClick={onTransfer}
            disabled={contas.length < 2}
          >
            <Repeat className="w-4 h-4 mr-2" /> TRANSFERIR
          </Button>
          <Button
            variant="outline"
            className="h-12 px-6 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
            onClick={onFechamento}
          >
            <Lock className="w-4 h-4 mr-2" /> FECHAMENTOS
          </Button>
          <Button
            variant="primary"
            className="h-12 px-8 font-black italic tracking-tight shadow-lg shadow-primary/20"
            onClick={onNew}
          >
            <Plus className="w-5 h-5 mr-2" /> NOVA CONTA
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="glass p-8 rounded-2xl border border-border h-64 animate-pulse"
            />
          ))
        ) : contas.length === 0 ? (
          <div className="col-span-full glass p-32 text-center rounded-2xl border border-dashed border-border relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50" />
            <div className="relative z-10">
              <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-8 border border-primary/20">
                <Building2 className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight mb-3">Tesouraria Vazia</h3>
              <p className="text-[var(--ui-text-secondary)] mb-10 max-w-md mx-auto text-sm font-medium">
                Sua infraestrutura financeira ainda não possui contas ativas.
              </p>
              <Button variant="primary" className="px-12 h-12 font-semibold" onClick={onNew}>
                Adicionar Primeira Conta
              </Button>
            </div>
          </div>
        ) : (
          contas.map((c) => {
            const isPos = Number(c.saldo_atual || 0) >= 0;
            return (
              <div
                key={c.id}
                className="glass group hover:border-primary/40 transition-all duration-500 rounded-2xl overflow-hidden flex flex-col h-full border border-border relative"
              >
                <div
                  className={`absolute -right-10 -top-10 w-32 h-32 blur-[60px] rounded-full opacity-10 transition-opacity group-hover:opacity-20 ${isPos ? 'bg-emerald-500' : 'bg-red-500'}`}
                />
                <div className="p-8 flex-1 relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border ${c.tipo === 'caixa' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : c.tipo === 'aplicacao' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}
                        >
                          {c.tipo?.replace(/_/g, ' ')}
                        </span>
                        {c.banco_codigo && (
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                            BCO: {c.banco_codigo}
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-black italic tracking-tighter group-hover:text-primary transition-colors truncate max-w-[220px] mt-2">
                        {c.nome}
                      </h3>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border flex items-center justify-center text-primary font-black text-2xl shadow-inner group-hover:border-primary/30 transition-all">
                      {(c.nome || 'C').charAt(0)}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic mb-1 flex items-center gap-2">
                        SALDO DISPONÍVEL{' '}
                        <ChevronRight className="w-3 h-3 text-primary opacity-50" />
                      </div>
                      <div
                        className={`text-4xl font-black tracking-tighter italic ${isPos ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {fmt(Number(c.saldo_atual || 0))}
                      </div>
                    </div>
                    {c.agencia && (
                      <div className="flex gap-4 pt-4 border-t border-border">
                        <div className="flex-1">
                          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                            Agência
                          </div>
                          <div className="text-sm font-mono font-black">{c.agencia}</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                            Conta
                          </div>
                          <div className="text-sm font-mono font-black">{c.conta}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex border-t border-border bg-muted/40 p-2 gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1 h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                    onClick={() => onEdit(c)}
                  >
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" /> EDITAR
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                    onClick={() => onExtrato(c)}
                  >
                    <History className="w-4 h-4" /> EXTRATO
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-12 h-12 rounded-2xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all"
                    onClick={() => onDelete(c.id, c.nome)}
                    title="EXCLUIR CONTA"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        open={showTransferencia}
        onClose={onTransferClose}
        title="MOVIMENTAÇÃO DE TESOURARIA"
        size="md"
      >
        <div className="space-y-8 p-4">
          <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-[2rem] flex gap-4 items-start">
            <Info className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
            <p className="text-[11px] text-blue-200/70 font-medium leading-relaxed uppercase tracking-wider">
              <strong>Transferência entre contas:</strong> O valor será debitado da origem e
              creditado no destino instantaneamente.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-primary/20 border border-primary/40 rounded-full flex items-center justify-center z-10 hidden md:flex">
              <ChevronRight className="w-5 h-5 text-primary" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic text-center">
                CONTA ORIGEM
              </label>
              <select
                className="w-full bg-background border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all appearance-none font-bold text-center h-20"
                value={transferForm.conta_origem_id}
                onChange={(e) =>
                  onTransferFormChange({ ...transferForm, conta_origem_id: e.target.value })
                }
              >
                <option value="">SELECIONAR...</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic text-center">
                CONTA DESTINO
              </label>
              <select
                className="w-full bg-background border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all appearance-none font-bold text-center h-20"
                value={transferForm.conta_destino_id}
                onChange={(e) =>
                  onTransferFormChange({ ...transferForm, conta_destino_id: e.target.value })
                }
              >
                <option value="">SELECIONAR...</option>
                {contas
                  .filter((c) => c.id !== transferForm.conta_origem_id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome.toUpperCase()}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2 block italic text-center">
                VALOR DO REPASSE
              </label>
              <Input
                type="number"
                className="bg-transparent border-b-2 border-primary/30 rounded-none text-center text-3xl font-mono text-primary italic tracking-tighter focus:ring-0 focus:border-primary"
                value={transferForm.valor}
                onChange={(e) => onTransferFormChange({ ...transferForm, valor: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic">
                DATA DA OPERAÇÃO
              </label>
              <Input
                type="date"
                value={transferForm.data_movimento}
                onChange={(e) =>
                  onTransferFormChange({ ...transferForm, data_movimento: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic">
              MEMORIAL DESCRITIVO
            </label>
            <Input
              placeholder="EX: REFORÇO DE CAIXA, PAGAMENTO DE TAXAS..."
              value={transferForm.descricao}
              onChange={(e) => onTransferFormChange({ ...transferForm, descricao: e.target.value })}
            />
          </div>
          {transferErro && (
            <div className="flex items-center gap-4 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-black uppercase tracking-widest italic">
              <AlertCircle className="w-5 h-5 shrink-0" /> {transferErro}
            </div>
          )}
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              className="flex-1 h-14 font-black italic border-border/40 hover:bg-muted"
              onClick={onTransferClose}
            >
              DESCARTAR
            </Button>
            <Button
              variant="primary"
              className="flex-[2] h-14 font-black italic text-lg shadow-lg shadow-primary/20"
              onClick={onTransferSubmit}
              disabled={transferLoading}
            >
              {transferLoading ? 'PROCESSANDO...' : 'EXECUTAR TRANSFERÊNCIA'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showFechamento}
        onClose={onFechamentoClose}
        title="FECHAMENTOS DE CICLO"
        size="lg"
      >
        <div className="space-y-10 p-4">
          <div className="bg-orange-500/5 border border-orange-500/20 p-8 rounded-[2.5rem] flex gap-6 items-start relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
            <AlertCircle className="w-10 h-10 text-orange-500 shrink-0 mt-1 animate-pulse" />
            <div className="relative z-10">
              <h4 className="text-base font-black text-orange-400 mb-2 italic uppercase tracking-widest">
                PROTOCOLO DE SEGURANÇA
              </h4>
              <p className="text-xs text-orange-200/60 font-medium leading-relaxed uppercase tracking-widest">
                O fechamento de período <strong>BLOQUEIA</strong> permanentemente qualquer alteração
                em lançamentos retroativos.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end bg-muted/40 p-8 rounded-[2.5rem] border border-border shadow-inner">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground mb-1 block tracking-[0.3em] italic ml-2">
                MÊS DE REFERÊNCIA
              </label>
              <select
                className="w-full bg-background border border-border rounded-2xl px-5 py-4 appearance-none font-black italic uppercase text-sm"
                value={fechamentoForm.mes}
                onChange={(e) =>
                  onFechamentoFormChange({ ...fechamentoForm, mes: Number(e.target.value) })
                }
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground mb-1 block tracking-[0.3em] italic ml-2">
                ANO BASE
              </label>
              <select
                className="w-full bg-background border border-border rounded-2xl px-5 py-4 appearance-none font-black text-sm"
                value={fechamentoForm.ano}
                onChange={(e) =>
                  onFechamentoFormChange({ ...fechamentoForm, ano: Number(e.target.value) })
                }
              >
                {[2024, 2025, 2026, 2027].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="primary"
              className="h-[58px] font-black italic tracking-tight text-base"
              onClick={onFechamentoSave}
            >
              EFETUAR LACRE
            </Button>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-6 flex items-center gap-3 text-[var(--ui-text-secondary)]">
              <Lock className="w-4 h-4 text-primary" /> Linha do Tempo de Segurança
            </h4>
            <div className="glass rounded-2xl overflow-hidden border border-border">
              <table className="w-full text-left">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-8 py-5 text-xs font-semibold text-[var(--ui-text-secondary)]">
                      Ciclo Mensal
                    </th>
                    <th className="px-8 py-5 text-xs font-semibold text-[var(--ui-text-secondary)]">
                      Status de Integridade
                    </th>
                    <th className="px-8 py-5 text-xs font-semibold text-[var(--ui-text-secondary)] text-right">
                      Ações de Gestor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fechamentos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-8 py-12 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest italic opacity-50"
                      >
                        Nenhum ciclo fechado
                      </td>
                    </tr>
                  ) : (
                    fechamentos.map((f: any) => (
                      <tr key={f.id} className="hover:bg-muted/20 group transition-colors">
                        <td className="px-8 py-5 font-black italic tracking-tight text-base capitalize">
                          {new Date(2000, f.mes - 1).toLocaleString('pt-BR', { month: 'long' })}{' '}
                          <span className="text-primary">/ {f.ano}</span>
                        </td>
                        <td className="px-8 py-5">
                          <span
                            className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border ${f.status === 'fechado' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}
                          >
                            {f.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button
                            className="text-[10px] font-black text-primary hover:text-white uppercase tracking-widest italic underline decoration-primary/30 underline-offset-4"
                            onClick={() => onReabrirFechamento?.(f)}
                          >
                            REABRIR CICLO
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
