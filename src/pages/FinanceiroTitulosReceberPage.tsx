import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Modal, Button, Input } from '../components/common';

import {
  Plus,
  CheckCircle,
  Trash2,
  ArrowDownLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Edit2,
  Printer,
  TrendingUp,
  MessageCircle,
  ArrowLeft,
} from 'lucide-react';
import { WhatsAppService } from '../modules/plano-corte/infrastructure/services/WhatsAppService';
import ReciboModal from '../components/ReciboModal';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import type { Titulo, ContaInterna } from '../modules/financeiro/domain/types';
import { TableSkeleton } from '../components/common/Skeleton';

export default function FinanceiroTitulosReceberPage() {
  const { success, error } = useToast();
  const [ConfirmDialogElement, confirmAction] = useConfirm();
  const [rows, setRows] = useState<Titulo[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [baixaModal, setBaixaModal] = useState<Titulo | null>(null);
  const [reciboModal, setReciboModal] = useState<Titulo | null>(null);
  const [contas, setContas] = useState<ContaInterna[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [editModal, setEditModal] = useState<Titulo | null>(null);
  const [antecipacaoModal, setAntecipacaoModal] = useState<Titulo | null>(null);
  const [taxaAntecipacao, setTaxaAntecipacao] = useState(3.5); // Taxa mensal padrÃ£o

  const [stats, setStats] = useState({
    totalAberto: 0,
    totalVencido: 0,
    totalRecebido: 0,
  });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.financeiro.titulosReceber.list({ page: p, perPage });
      let dataRows: any[] = [];

      if (Array.isArray(res)) {
        dataRows = res;
        setTotal(res.length);
      } else if (res && res.rows) {
        dataRows = res.rows;
        setTotal(res.total || 0);
      } else {
        dataRows = [];
        setTotal(0);
      }

      setRows(dataRows);

      let aberto = 0;
      let vencido = 0;
      let recebido = 0;
      const hoje = new Date();

      dataRows.forEach((r) => {
        const valor = Number(r.valor_aberto) || 0;
        if (r.status === 'pago') {
          recebido += Number(r.valor_original);
        } else {
          aberto += valor;
          if (new Date(r.data_vencimento) < hoje) {
            vencido += valor;
          }
        }
      });
      setStats({ totalAberto: aberto, totalVencido: vencido, totalRecebido: recebido });

      const clients = await api.clients.list();
      const map: Record<string, string> = {};
      (clients || []).forEach((c: any) => {
        map[c.id] = c.nome || c.name || `${c.id}`;
      });
      setClientsMap(map);

      const cts = await api.financeiro.contasInternas.list();
      setContas(cts || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const doDelete = async (id: string) => {
    const isConfirmed = await confirmAction({
      title: 'Excluir TÃ­tulo',
      description: 'Confirma exclusÃ£o do tÃ­tulo?',
    });
    if (!isConfirmed) return;
    try {
      await api.financeiro.titulosReceber.delete(id);
      load(page);
    } catch (err: any) {
      error(err.message || 'Erro ao excluir');
    }
  };

  const saveEdit = async () => {
    if (!editModal) return;
    try {
      await api.financeiro.titulosReceber.update(editModal.id, {
        numero_titulo: editModal.numero_titulo,
        valor_original: editModal.valor_original,
        data_vencimento: editModal.data_vencimento,
        taxa_financeira: editModal.taxa_financeira,
        valor_custo_financeiro: editModal.valor_custo_financeiro,
        status: editModal.status,
      });
      setEditModal(null);
      load(page);
      success('AlteraÃ§Ãµes salvas com sucesso');
    } catch (err: any) {
      error(err.message || 'Erro ao salvar alteraÃ§Ãµes');
    }
  };

  const getStatusStyle = (status: string, vencimento: string) => {
    if (status === 'pago') return { background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' };
    if (new Date(vencimento) < new Date())
      return { background: 'rgba(239, 68, 68, 0.15)', color: 'hsl(var(--destructive))' };
    return { background: 'rgba(245, 158, 11, 0.15)', color: 'hsl(var(--warning))' };
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in">
      <Button
        variant="ghost"
        onClick={() => (window.location.hash = '#/financeiro')}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4 p-0 h-auto hover:bg-transparent"
      >
        <ArrowLeft size={16} /> Voltar ao Painel Financeiro
      </Button>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3 uppercase italic">
            <ArrowDownLeft className="text-primary w-10 h-10" />
            TÃ­tulos a <span className="text-primary">Receber</span>
          </h1>
          <p className="text-muted-foreground mt-1 font-medium italic">
            GestÃ£o estratÃ©gica de recebÃ­veis e fluxo de caixa industrial
          </p>
        </div>
        <Button
          variant="primary"
          className="h-14 px-8 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          onClick={() => (window.location.hash = '#/financeiro/titulos-receber/wizard')}
        >
          <Plus size={24} /> NOVO RECEBIMENTO
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          {
            label: 'Total a Receber',
            value: stats.totalAberto,
            color: 'text-blue-400',
            border: 'border-blue-500/50',
            icon: ArrowDownLeft,
          },
          {
            label: 'Total Recebido',
            value: stats.totalRecebido,
            color: 'text-emerald-400',
            border: 'border-emerald-500/50',
            icon: CheckCircle,
          },
          {
            label: 'Em Atraso',
            value: stats.totalVencido,
            color: 'text-red-400',
            border: 'border-red-500/50',
            icon: Calendar,
          },
        ].map((stat, i) => (
          <div key={i} className={`glass-elevated p-6 animate-fade-in border-l-4 ${stat.border}`}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-black tracking-widest text-muted-foreground uppercase">
                {stat.label}
              </span>
              <stat.icon className={`${stat.color}`} size={20} />
            </div>
            <div className={`text-3xl font-black tracking-tight ${stat.color}`}>
              R$ {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="glass-elevated overflow-hidden mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-black tracking-widest text-muted-foreground uppercase">
                  TÃ­tulo
                </th>
                <th className="px-6 py-4 text-xs font-black tracking-widest text-muted-foreground uppercase">
                  Cliente
                </th>
                <th className="px-6 py-4 text-xs font-black tracking-widest text-muted-foreground uppercase text-right">
                  Valor Original
                </th>
                <th className="px-6 py-4 text-xs font-black tracking-widest text-muted-foreground uppercase">
                  Vencimento
                </th>
                <th className="px-6 py-4 text-xs font-black tracking-widest text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-black tracking-widest text-muted-foreground uppercase text-center">
                  AÃ§Ãµes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <p className="text-muted-foreground font-medium italic">
                      Nenhum lanÃ§amento encontrado no perÃ­odo.
                    </p>
                  </td>
                </tr>
              ) : (
                Object.entries(
                  rows.reduce((acc: Record<string, Titulo[]>, r: Titulo) => {
                    const cid = r.cliente_id || 'unknown';
                    if (!acc[cid]) acc[cid] = [];
                    acc[cid].push(r);
                    return acc;
                  }, {}),
                ).map(([cid, groupRows]: [string, Titulo[]]) => {
                  const isExpanded = expandedGroups[cid];
                  const clientName = clientsMap[cid] || 'NÃƒO IDENTIFICADO';
                  const totalGroup = groupRows.reduce(
                    (sum, r) => sum + Number(r.valor_original),
                    0,
                  );

                  return (
                    <React.Fragment key={cid}>
                      {/* Group Header Row */}
                      <tr
                        onClick={() =>
                          setExpandedGroups((prev) => ({ ...prev, [cid]: !prev[cid] }))
                        }
                        className="bg-white/[0.03] cursor-pointer hover:bg-white/[0.05] transition-colors border-l-4 border-primary"
                      >
                        <td colSpan={2} className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {isExpanded ? (
                              <ChevronDown className="text-primary" />
                            ) : (
                              <ChevronRight className="text-primary" />
                            )}
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black shadow-inner">
                              {clientName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-black tracking-tight text-lg text-white">
                                {clientName}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                {groupRows.length} tÃ­tulos pendentes
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-primary font-black text-lg">
                            R$ {totalGroup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td colSpan={3} className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] font-black tracking-widest text-red-400/70 hover:text-red-400 transition-colors uppercase flex items-center gap-1 ml-auto group"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const isConfirmed = await confirmAction({
                                title: 'Excluir Lote Industrial',
                                description: `ATENÃ‡ÃƒO: Deseja realmente excluir todos os ${groupRows.length} tÃ­tulos deste cliente? Esta aÃ§Ã£o nÃ£o pode ser desfeita.`,
                              });
                              if (isConfirmed) {
                                api.financeiro.titulosReceber
                                  .deleteBatch(cid)
                                  .then(() => load(page));
                              }
                            }}
                          >
                            <Trash2
                              size={12}
                              className="group-hover:scale-110 transition-transform"
                            />{' '}
                            EXCLUIR LOTE
                          </Button>
                        </td>
                      </tr>

                      {/* Detail Rows */}
                      {isExpanded &&
                        groupRows.map((r) => (
                          <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4 pl-20">
                              <span className="font-mono font-bold text-primary tracking-tighter text-sm opacity-80 group-hover:opacity-100">
                                #{r.numero_titulo}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[11px] text-muted-foreground font-medium italic">
                                LanÃ§amento Direto
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-white italic">
                              R${' '}
                              {Number(r.valor_original).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                <Calendar size={14} className="opacity-50" />
                                {new Date(r.data_vencimento).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {(() => {
                                const style = getStatusStyle(r.status, r.data_vencimento);
                                return (
                                  <span
                                    className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm"
                                    style={style}
                                  >
                                    {r.status === 'pago'
                                      ? 'LIQUIDADO'
                                      : new Date(r.data_vencimento) < new Date()
                                        ? 'EM ATRASO'
                                        : 'ABERTO'}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all"
                                  title="Editar"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditModal(r);
                                  }}
                                >
                                  <Edit2 size={16} />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-400 disabled:opacity-20 transition-all"
                                  title="Baixar TÃ­tulo"
                                  disabled={r.status === 'pago'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBaixaModal(r);
                                  }}
                                >
                                  <CheckCircle size={16} />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition-all"
                                  title="Excluir"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    doDelete(r.id);
                                  }}
                                >
                                  <Trash2 size={16} />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all"
                                  title="Recibo"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReciboModal(r);
                                  }}
                                >
                                  <Printer size={16} />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#25D366] hover:bg-[#25D366]/20 transition-all"
                                  title="WhatsApp"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const msg =
                                      r.status === 'pago'
                                        ? 'Obrigado pelo pagamento!'
                                        : new Date(r.data_vencimento) < new Date()
                                          ? 'Aviso de Atraso'
                                          : 'Lembrete de Vencimento';
                                    await WhatsAppService.notificarProducaoIniciada(
                                      clientsMap[r.cliente_id] || 'Cliente',
                                      '4799999-9999',
                                      `TÃ­tulo ${r.numero_titulo} - ${msg}`,
                                    );
                                    success('Mensagem enviada!');
                                  }}
                                >
                                  <MessageCircle size={16} />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-primary hover:bg-primary/20 disabled:opacity-20 transition-all"
                                  title="Simular AntecipaÃ§Ã£o"
                                  disabled={r.status === 'pago'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAntecipacaoModal(r);
                                  }}
                                >
                                  <TrendingUp size={16} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Footer with items count */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-black text-muted-foreground uppercase tracking-widest">
          <div>
            Exibindo <span className="text-white font-black">{rows.length}</span> de{' '}
            <span className="text-white font-black">{total}</span> tÃ­tulos industriais
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 uppercase font-black italic"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 uppercase font-black italic"
              disabled={page * perPage >= total}
              onClick={() => setPage(page + 1)}
            >
              PrÃ³xima
            </Button>
          </div>
        </div>
      </div>

      {/* Modal AntecipaÃ§Ã£o */}
      <Modal
        isOpen={!!antecipacaoModal}
        onClose={() => setAntecipacaoModal(null)}
        title="Simulador de AntecipaÃ§Ã£o Industrial"
        size="md"
      >
        {antecipacaoModal &&
          (() => {
            const hoje = new Date();
            const venc = new Date(antecipacaoModal.data_vencimento);
            const diasParaVencer = Math.max(
              0,
              Math.floor((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)),
            );
            const valorOriginal = Number(antecipacaoModal.valor_aberto || 0);

            const taxaMensal = taxaAntecipacao / 100;
            const taxaDiaria = taxaMensal / 30;
            const valorDesconto = valorOriginal * (taxaDiaria * diasParaVencer);
            const taxaFixa = valorOriginal * 0.005;
            const valorLiquido = valorOriginal - valorDesconto - taxaFixa;

            return (
              <div className="space-y-6">
                <Input
                  type="number"
                  label="Taxa Mensal de Desconto (%)"
                  value={taxaAntecipacao}
                  onChange={(e) => setTaxaAntecipacao(Number(e.target.value))}
                  helperText="MÃ©dia corporativa D'Luxury: 2.8% a 4.5%"
                />

                <div className="p-6 rounded-xl space-y-3 bg-primary/5 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Valor Bruto
                    </span>
                    <span className="font-bold text-white italic text-lg tracking-tighter">
                      R$ {valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Prazo Industrial
                    </span>
                    <span className="font-bold text-primary italic uppercase tracking-tighter">
                      {diasParaVencer} dias
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-red-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Desconto BancÃ¡rio
                    </span>
                    <span className="font-bold italic">
                      - R$ {valorDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-red-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Taxas Administrativas (0.5%)
                    </span>
                    <span className="font-bold italic">
                      - R$ {taxaFixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                    <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">
                      Valor LÃ­quido
                    </span>
                    <span className="text-3xl font-black text-primary italic tracking-tighter">
                      R$ {valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 justify-end">
                  <Button variant="outline" onClick={() => setAntecipacaoModal(null)}>
                    FECHAR
                  </Button>
                  <Button
                    variant="primary"
                    onClick={async () => {
                      const isConfirmed = await confirmAction({
                        title: 'Efetivar AntecipaÃ§Ã£o Industrial',
                        description:
                          'A antecipaÃ§Ã£o gera uma despesa financeira imediata. Deseja registrar a baixa com este valor lÃ­quido?',
                      });
                      if (isConfirmed) {
                        success('Fluxo de antecipaÃ§Ã£o registrado na DRE com sucesso!');
                        setAntecipacaoModal(null);
                      }
                    }}
                  >
                    EFETIVAR ANTECIPAÃ‡ÃƒO
                  </Button>
                </div>
              </div>
            );
          })()}
      </Modal>

      {/* Modal Baixa */}
      <Modal
        isOpen={!!baixaModal}
        onClose={() => setBaixaModal(null)}
        title="Registrar Recebimento Industrial"
        size="md"
      >
        {baixaModal &&
          (() => {
            const hoje = new Date();
            const venc = new Date(baixaModal.data_vencimento);
            const atraso = Math.max(
              0,
              Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24)),
            );
            const valorAberto = Number(baixaModal.valor_aberto || 0);

            const multaPerc = atraso > 0 ? 0.02 : 0;
            const jurosDiarioPerc = 0.00033;
            const valorMulta = valorAberto * multaPerc;
            const valorJuros = valorAberto * jurosDiarioPerc * atraso;
            const valorTotal = valorAberto + valorMulta + valorJuros;

            return (
              <div className="space-y-6">
                <div className="p-6 rounded-xl space-y-3 bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Valor Original
                    </span>
                    <span className="font-bold text-white italic text-lg tracking-tighter">
                      R$ {valorAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {atraso > 0 && (
                    <>
                      <div className="flex justify-between items-center text-red-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          Multa (2% - {atraso} dias)
                        </span>
                        <span className="font-bold italic">
                          + R$ {valorMulta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-red-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          Juros (1%/mÃªs)
                        </span>
                        <span className="font-bold italic">
                          + R$ {valorJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                    <span className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                      Valor Total
                    </span>
                    <span className="text-3xl font-black text-emerald-400 italic tracking-tighter">
                      R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">
                    Conta BancÃ¡ria de Destino
                  </label>
                  <select
                    id="conta-interna-id-receber"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary uppercase font-bold"
                  >
                    <option value="">Selecione a conta corporativa...</option>
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome.toUpperCase()} - SALDO: R${' '}
                        {Number(c.saldo_atual).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 justify-end">
                  <Button variant="outline" onClick={() => setBaixaModal(null)}>
                    CANCELAR
                  </Button>
                  <Button
                    variant="primary"
                    onClick={async () => {
                      try {
                        const contaId = (
                          document.getElementById('conta-interna-id-receber') as HTMLSelectElement
                        ).value;
                        if (!contaId) throw new Error('Selecione uma conta');

                        await api.financeiro.titulosReceber.baixar(baixaModal.id, {
                          valor_baixa: valorTotal,
                          valor_original_baixa: valorAberto,
                          valor_multa: valorMulta,
                          valor_juros: valorJuros,
                          conta_interna_id: contaId,
                          data_baixa: new Date().toISOString(),
                        });
                        setBaixaModal(null);
                        load(page);
                        success('Recebimento corporativo registrado com sucesso!');
                      } catch (err: any) {
                        error(err.message || 'Erro ao registrar baixa');
                      }
                    }}
                  >
                    CONFIRMAR RECEBIMENTO
                  </Button>
                </div>
              </div>
            );
          })()}
      </Modal>

      {/* Modal EdiÃ§Ã£o Individual */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title="ManutenÃ§Ã£o de TÃ­tulo Industrial"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Input
              label="NÃºmero do TÃ­tulo"
              className="font-mono font-bold"
              value={editModal?.numero_titulo || ''}
              onChange={(e) =>
                editModal && setEditModal({ ...editModal, numero_titulo: e.target.value })
              }
            />
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">
                Status Operacional
              </label>
              <select
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary uppercase font-bold"
                value={editModal?.status || ''}
                onChange={(e) =>
                  editModal && setEditModal({ ...editModal, status: e.target.value as any })
                }
              >
                <option value="aberto">ABERTO / PENDENTE</option>
                <option value="pago">LIQUIDADO</option>
                <option value="cancelado">CANCELADO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Input
              type="number"
              label="Valor Original (R$)"
              className="font-bold italic"
              value={editModal?.valor_original || 0}
              onChange={(e) =>
                editModal && setEditModal({ ...editModal, valor_original: Number(e.target.value) })
              }
            />
            <Input
              type="date"
              label="Data de Vencimento"
              className="font-bold"
              value={
                editModal?.data_vencimento
                  ? new Date(editModal.data_vencimento).toISOString().split('T')[0]
                  : ''
              }
              onChange={(e) =>
                editModal && setEditModal({ ...editModal, data_vencimento: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Input
              type="number"
              label="Taxa Financeira (%)"
              value={editModal?.taxa_financeira || 0}
              onChange={(e) =>
                editModal && setEditModal({ ...editModal, taxa_financeira: Number(e.target.value) })
              }
            />
            <Input
              type="number"
              label="Custo Financeiro (R$)"
              value={editModal?.valor_custo_financeiro || 0}
              onChange={(e) =>
                editModal &&
                setEditModal({ ...editModal, valor_custo_financeiro: Number(e.target.value) })
              }
            />
          </div>

          <div className="flex gap-4 justify-end pt-6 border-t border-white/5">
            <Button variant="outline" onClick={() => setEditModal(null)}>
              CANCELAR
            </Button>
            <Button variant="primary" onClick={saveEdit}>
              SALVAR ALTERAÃ‡Ã•ES
            </Button>
          </div>
        </div>
      </Modal>

      <ReciboModal
        isOpen={!!reciboModal}
        onClose={() => setReciboModal(null)}
        titulo={reciboModal as any}
        tipo="receber"
        beneficiarioOuPagador={reciboModal ? clientsMap[reciboModal.cliente_id] || 'Cliente' : ''}
      />

      {ConfirmDialogElement}
    </div>
  );
}
