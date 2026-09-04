import { Modal, Button, Input } from '../common';
import {
  Download,
  FileText,
  Search,
  Filter,
  X,
  ChevronRight,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  Info,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import type { ExtratoPayload } from '../../modules/financeiro/domain/types';

interface Props {
  showExtrato: boolean;
  extrato: ExtratoPayload | null;
  extratoLoading: boolean;
  extratoContaNome: string;
  filtroBusca: string;
  filtroTipo: 'todos' | 'entrada' | 'saida';
  extratoFiltrado: any[];
  extratoTotais: { entradas: number; saidas: number; liquido: number; qtd: number };
  onClose: () => void;
  onFiltroBuscaChange: (v: string) => void;
  onFiltroTipoChange: (v: 'todos' | 'entrada' | 'saida') => void;
  onExportCSV: () => void;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ContasExtratoModal({
  showExtrato,
  extrato,
  extratoLoading,
  extratoContaNome,
  filtroBusca,
  filtroTipo,
  extratoFiltrado,
  extratoTotais,
  onClose,
  onFiltroBuscaChange,
  onFiltroTipoChange,
  onExportCSV,
}: Props) {
  const { success } = useToast();

  return (
    <Modal
      open={showExtrato}
      onClose={onClose}
      title={`EXTRATO ANALÍTICO — ${extratoContaNome.toUpperCase()}`}
      size="full"
    >
      {extratoLoading ? (
        <div className="h-[600px] p-8 space-y-8 animate-pulse">
          <div className="grid grid-cols-4 gap-4 h-32 bg-muted/40 rounded-3xl" />
          <div className="h-full bg-muted/40 rounded-3xl" />
        </div>
      ) : (
        <div className="space-y-10 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                label: 'Saldo Anterior',
                value: extrato?.saldo_inicial || 0,
                color: 'text-muted-foreground',
                border: 'border-border',
                icon: <History className="w-4 h-4" />,
              },
              {
                label: 'Total Entradas',
                value: extratoTotais.entradas,
                color: 'text-emerald-500',
                border: 'border-emerald-500/30',
                icon: <ArrowUpCircle className="w-4 h-4" />,
              },
              {
                label: 'Total Saídas',
                value: extratoTotais.saidas,
                color: 'text-red-500',
                border: 'border-red-500/30',
                icon: <ArrowDownCircle className="w-4 h-4" />,
                isNeg: true,
              },
              {
                label: 'Saldo Projetado',
                value: extrato?.conta?.saldo_atual || 0,
                color: 'text-primary',
                border: 'border-primary/40',
                icon: <TrendingUp className="w-4 h-4" />,
                highlight: true,
              },
            ].map((card, i) => (
              <div
                key={i}
                className={`glass p-6 rounded-2xl border-l-4 ${card.border} relative overflow-hidden`}
              >
                {card.highlight && <div className="absolute inset-0 bg-primary/5" />}
                <p className="text-xs font-semibold text-[var(--ui-text-secondary)] mb-3 flex items-center gap-2">
                  {card.icon} {card.label}
                </p>
                <p className={`text-xl font-bold tracking-tight ${card.color}`}>
                  {(card as any).isNeg ? '- ' : card.value > 0 && i !== 0 && i !== 3 ? '+ ' : ''}
                  {fmt(card.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col xl:flex-row gap-6 items-end bg-muted/20 p-8 rounded-[2.5rem] border border-border">
            <div className="flex-1 w-full space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic ml-2">
                PESQUISA DINÂMICA
              </label>
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-50 z-10" />
                <Input
                  className="pl-14"
                  placeholder="Filtrar por descrição, origem ou tipo..."
                  value={filtroBusca}
                  onChange={(e) => onFiltroBuscaChange(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-64 space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic ml-2">
                FLUXO
              </label>
              <div className="relative">
                <select
                  className="w-full bg-background border border-border rounded-2xl px-6 py-4 text-sm font-black italic appearance-none focus:outline-none focus:border-primary/50 uppercase"
                  value={filtroTipo}
                  onChange={(e) => onFiltroTipoChange(e.target.value as any)}
                >
                  <option value="todos">TODOS OS LANÇAMENTOS</option>
                  <option value="entrada">ENTRADAS (+)</option>
                  <option value="saida">SAÍDAS (-)</option>
                </select>
                <Filter className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-50 pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-[58px] px-8 font-black italic tracking-widest group border-border/40 hover:bg-muted"
                onClick={onExportCSV}
              >
                <Download className="w-5 h-5 mr-2 group-hover:-translate-y-1 transition-transform" />{' '}
                CSV
              </Button>
              <Button
                variant="primary"
                className="h-[58px] px-8 font-black italic tracking-widest"
                onClick={() => window.print()}
              >
                <FileText className="w-5 h-5 mr-2" /> PDF
              </Button>
            </div>
          </div>

          <div className="glass rounded-2xl overflow-hidden border border-border shadow-2xl relative">
            <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0A0A0A] z-20">
                  <tr className="border-b border-border">
                    <th className="px-8 py-6 text-xs font-semibold text-[var(--ui-text-secondary)]">
                      Data de Efetivação
                    </th>
                    <th className="px-8 py-6 text-xs font-semibold text-[var(--ui-text-secondary)]">
                      Memorial / Descrição
                    </th>
                    <th className="px-8 py-6 text-xs font-semibold text-[var(--ui-text-secondary)]">
                      Módulo Origem
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic text-right">
                      Valor Operacional
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic text-right">
                      Saldo Progressivo
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic text-center">
                      Auditoria
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {extratoFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-32 text-center">
                        <Info className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em] italic">
                          Nenhum lançamento identificado para os filtros aplicados
                        </p>
                      </td>
                    </tr>
                  ) : (
                    extratoFiltrado.map((m: any, i: number) => {
                      const isPos = Number(m.valor) > 0;
                      return (
                        <tr
                          key={m.id || i}
                          className={`group transition-colors hover:bg-muted/20 ${m.conferido ? 'opacity-40 grayscale' : ''}`}
                        >
                          <td className="px-8 py-5 text-xs font-mono font-bold tracking-widest text-muted-foreground">
                            {new Date(m.data).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-sm font-black italic tracking-tight group-hover:text-primary transition-colors">
                              {m.descricao || m.tipo}
                            </div>
                            <div className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
                              {m.tipo}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-[10px] font-black bg-primary/5 border border-primary/20 px-3 py-1 rounded-lg text-primary italic uppercase tracking-wider">
                              {m.origem}
                            </span>
                          </td>
                          <td
                            className={`px-8 py-5 text-right font-black font-mono text-base tracking-tighter ${isPos ? 'text-emerald-400' : 'text-red-400'}`}
                          >
                            {isPos ? '+' : '-'} {fmt(Math.abs(Number(m.valor)))}
                          </td>
                          <td className="px-8 py-5 text-right font-bold font-mono text-xs text-muted-foreground/60">
                            {fmt(Number(m.saldo_momento))}
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex justify-center">
                              <button
                                onClick={() => {
                                  api.financeiro.conferencia
                                    .toggle({ id: m.id, origem: m.origem, conferido: !m.conferido })
                                    .then(() => {
                                      success(
                                        m.conferido
                                          ? 'CONFERÊNCIA REVOGADA'
                                          : 'LANÇAMENTO AUDITADO',
                                      );
                                    });
                                }}
                                className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center group/check ${m.conferido ? 'bg-emerald-500 border-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'border-border hover:border-primary/50'}`}
                              >
                                {m.conferido ? (
                                  <X className="w-5 h-5 font-black" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 opacity-0 group-hover/check:opacity-100 transition-opacity" />
                                )}
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
          </div>

          <div className="flex justify-end pt-4">
            <Button
              variant="primary"
              className="px-16 h-14 font-black italic text-lg"
              onClick={onClose}
            >
              FECHAR AUDITORIA
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
