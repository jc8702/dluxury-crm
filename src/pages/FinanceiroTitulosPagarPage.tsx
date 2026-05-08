import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Modal } from '../design-system/components/Modal';
import { Plus, Filter, CheckCircle, Trash2, ArrowUpRight, Calendar, Truck, ChevronDown, ChevronRight, Edit2, Printer, RefreshCw, FileText, Square, CheckSquare, Layers } from 'lucide-react';
import ReciboModal from '../components/ReciboModal';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import type { Titulo, ContaInterna } from '../modules/financeiro/domain/types';
import { TableSkeleton } from '../design-system/components/Skeleton';

export default function FinanceiroTitulosPagarPage() {
  const { success, error, warning } = useToast();
  const [ConfirmDialogElement, confirmAction] = useConfirm();
  const [rows, setRows] = useState<Titulo[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [suppliersMap, setSuppliersMap] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [baixaModal, setBaixaModal] = useState<Titulo | null>(null);
  const [reciboModal, setReciboModal] = useState<Titulo | null>(null);
  const [contas, setContas] = useState<ContaInterna[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loteModal, setLoteModal] = useState(false);
  const [loteData, setLoteData] = useState({ conta_interna_id: '', data_baixa: new Date().toISOString().split('T')[0], observacoes: '' });
  const [loteLoading, setLoteLoading] = useState(false);
  const [editModal, setEditModal] = useState<Titulo | null>(null);

  const [stats, setStats] = useState({
    totalAberto: 0,
    totalVencido: 0,
    totalPago: 0
  });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.financeiro.titulosPagar.list({ page: p, perPage });
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
      let pago = 0;
      const hoje = new Date();

      dataRows.forEach(r => {
        const valor = Number(r.valor_aberto) || 0;
        if (r.status === 'pago') {
          pago += Number(r.valor_original);
        } else {
          aberto += valor;
          if (new Date(r.data_vencimento) < hoje) {
            vencido += valor;
          }
        }
      });
      setStats({ totalAberto: aberto, totalVencido: vencido, totalPago: pago });

      const suppliers = await api.suppliers.list();
      const map: Record<string,string> = {};
      (suppliers || []).forEach((s: any) => { map[s.id] = s.nome || s.name || `${s.id}`; });
      setSuppliersMap(map);
      
      const cts = await api.financeiro.contasInternas.list();
      setContas(cts || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const confirmarBaixa = async () => {
    try {
      const contaId = (document.getElementById('conta-interna-id') as HTMLSelectElement).value;
      if (!contaId) throw new Error('Selecione uma conta');
      
      await api.financeiro.titulosPagar.baixar(baixaModal.id, {
        valor_baixa: baixaModal.valor_aberto,
        conta_interna_id: contaId,
        data_baixa: new Date()
      });
      setBaixaModal(null);
      load(page);
      success('Pagamento registrado com sucesso!');
    } catch (err: any) {
      error(err.message || 'Erro ao registrar pagamento');
    }
  };

  const doDelete = async (id: string) => {
    const isConfirmed = await confirmAction({
      title: 'Excluir Título',
      description: 'Confirma exclusão do título?'
    });
    if (!isConfirmed) return;
    try {
      await api.financeiro.titulosPagar.delete(id);
      load(page);
    } catch (err: any) {
      error(err.message || 'Erro ao excluir');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllAbertos = () => {
    const ids = rows.filter(r => r.status === 'aberto').map((r: any) => r.id);
    setSelectedIds(new Set(ids));
  };

  const handleBaixaLote = async () => {
    if (!loteData.conta_interna_id) { warning('Selecione a conta de pagamento'); return; }
    if (selectedIds.size === 0) { warning('Nenhum título selecionado'); return; }
    setLoteLoading(true);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try {
        await api.financeiro.titulosPagar.baixar(id, {
          conta_interna_id: loteData.conta_interna_id,
          data_baixa: loteData.data_baixa,
          observacoes: loteData.observacoes || 'Baixa em lote',
        });
        ok++;
      } catch { fail++; }
    }
    setLoteLoading(false);
    setLoteModal(false);
    setSelectedIds(new Set());
    success(`${ok} títulos pagos com sucesso.${fail > 0 ? ` ${fail} falharam.` : ''}`);
    load(page);
  };


  const saveEdit = async () => {
    try {
      await api.financeiro.titulosPagar.update(editModal.id, {
        numero_titulo: editModal.numero_titulo,
        valor_original: editModal.valor_original,
        data_vencimento: editModal.data_vencimento,
        taxa_financeira: editModal.taxa_financeira,
        valor_custo_financeiro: editModal.valor_custo_financeiro,
        status: editModal.status
      });
      setEditModal(null);
      load(page);
      success('Alterações salvas com sucesso');
    } catch (err: any) {
      error(err.message || 'Erro ao salvar alterações');
    }
  };

  const getStatusStyle = (status: string, vencimento: string) => {
    if (status === 'pago') return { background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' };
    if (new Date(vencimento) < new Date()) return { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' };
    return { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
      {/* Header Corporativo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic flex items-center gap-3">
            <ArrowUpRight className="text-red-500 w-10 h-10" />
            TÍTULOS A PAGAR
          </h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] mt-2 ml-1 italic opacity-60">
            Gestão Industrial de Saídas & Compromissos
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {selectedIds.size > 0 && (
            <button 
              className="btn-primary h-12 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest italic shadow-lg shadow-primary/20 flex items-center gap-2 bg-orange-600"
              onClick={() => setLoteModal(true)}
            >
              <Layers className="w-4 h-4" /> PAGAR {selectedIds.size} EM LOTE
            </button>
          )}
          <button 
            className="btn-outline h-12 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest italic flex items-center gap-2"
            onClick={selectAllAbertos}
          >
            <CheckSquare className="w-4 h-4" /> SELECIONAR ABERTOS
          </button>
          {selectedIds.size > 0 && (
            <button className="btn-outline h-12 px-4 rounded-xl text-[11px] font-black text-red-400 hover:bg-red-400/10 border-red-400/30 transition-all uppercase italic" onClick={() => setSelectedIds(new Set())}>
              LIMPAR ({selectedIds.size})
            </button>
          )}
          <button 
            className="btn-primary h-12 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest italic flex items-center gap-2 bg-red-600 border-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20"
            onClick={() => window.location.hash = '#/financeiro/titulos-pagar/wizard'}
          >
            <Plus className="w-4 h-4" /> NOVO PAGAMENTO
          </button>
        </div>
      </div>

      {/* Stats Grid Industrial */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total a Pagar', value: stats.totalAberto, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: ArrowUpRight },
          { label: 'Total Pago', value: stats.totalPago, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle },
          { label: 'Total Vencido', value: stats.totalVencido, color: 'text-red-600', bg: 'bg-red-600/15', border: 'border-red-600/30', icon: Calendar },
        ].map((stat, i) => (
          <div key={i} className={`glass-elevated p-6 rounded-2xl border ${stat.border} ${stat.bg} relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}>
             <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic group-hover:text-white transition-colors">
                  {stat.label}
                </span>
                <stat.icon className={`w-5 h-5 ${stat.color} opacity-80 group-hover:scale-110 transition-transform`} />
             </div>
             <div className="text-3xl font-black tracking-tighter italic text-white group-hover:text-primary transition-colors">
               R$ {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
             </div>
             <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${stat.color} opacity-5 blur-3xl rounded-full group-hover:opacity-10 transition-opacity`}></div>
          </div>
        ))}
      {/* Tabela Industrial de Compromissos */}
      <div className="glass-elevated rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/5">
                <th className="w-12 px-6 py-5">
                   <div className="flex items-center justify-center">
                     <button onClick={selectAllAbertos} className="text-muted-foreground hover:text-primary transition-colors">
                       <CheckSquare className="w-4 h-4" />
                     </button>
                   </div>
                </th>
                <th className="text-left px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Identificação</th>
                <th className="text-left px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Status Operacional</th>
                <th className="text-right px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Valor Bruto</th>
                <th className="text-left px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Vencimento</th>
                <th className="text-left px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Badges</th>
                <th className="text-center px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Comandos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="p-0"><TableSkeleton rows={8} cols={7} /></td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <FileText className="w-16 h-16" />
                      <p className="text-xs font-black uppercase tracking-[0.4em]">Nenhum compromisso industrial registrado</p>
                    </div>
                  </td>
                </tr>
              ) : (
                Object.entries(
                  rows.reduce((acc: any, r) => {
                    const sid = r.fornecedor_id || 'unknown';
                    if (!acc[sid]) acc[sid] = [];
                    acc[sid].push(r);
                    return acc;
                  }, {})
                ).map(([sid, groupRows]: [string, any]) => {
                  const isExpanded = expandedGroups[sid];
                  const supplierName = (suppliersMap[sid] || 'FORNECEDOR NÃO IDENTIFICADO').toUpperCase();
                  const totalGroup = groupRows.reduce((sum: number, r: any) => sum + Number(r.valor_original), 0);
                  
                  return (
                    <React.Fragment key={sid}>
                      {/* Grupo: Fornecedor */}
                      <tr 
                        onClick={() => setExpandedGroups(prev => ({ ...prev, [sid]: !prev[sid] }))}
                        className="bg-white/[0.02] cursor-pointer hover:bg-white/[0.05] transition-all border-l-4 border-red-500 group"
                      >
                        <td className="px-6 py-4">
                           <div className="flex items-center justify-center">
                             {isExpanded ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />}
                           </div>
                        </td>
                        <td colSpan={2} className="px-4 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-black italic">
                              {supplierName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-black text-white italic tracking-tight uppercase">{supplierName}</div>
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{groupRows.length} Títulos Industriais</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right px-4 py-4">
                          <div className="text-lg font-black text-red-500 italic tracking-tighter">
                            R$ {totalGroup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td colSpan={3} className="px-6 py-4 text-right">
                          <button 
                            className="btn-outline h-9 px-4 rounded-lg text-[10px] font-black text-red-400 hover:bg-red-400/10 border-red-400/30 transition-all uppercase italic flex items-center gap-2 ml-auto"
                            onClick={async (e) => { 
                              e.stopPropagation(); 
                              const isConfirmed = await confirmAction({
                                title: 'ELIMINAÇÃO EM MASSA',
                                description: `DESEJA REALMENTE EXCLUIR TODOS OS ${groupRows.length} TÍTULOS DESTE FORNECEDOR? ESTA AÇÃO É IRREVERSÍVEL NO ERP.`
                              });
                              if(isConfirmed) {
                                api.financeiro.titulosPagar.deleteBatch(sid).then(() => {
                                  load(page);
                                });
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" /> EXCLUIR LOTE
                          </button>
                        </td>
                      </tr>

                      {/* Linhas Detalhadas */}
                      {isExpanded && groupRows.map((r: any) => {
                        const isSelected = selectedIds.has(r.id);
                        return (
                          <tr key={r.id} className={`hover:bg-white/[0.03] transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                            <td className="px-6 py-4">
                               <div className="flex items-center justify-center">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); toggleSelect(r.id); }}
                                   className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-black' : 'border-white/20 text-transparent hover:border-primary/50'}`}
                                 >
                                   <CheckSquare className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                            </td>
                            <td className="px-4 py-4 font-mono text-xs font-black text-red-400 tracking-widest italic">{r.numero_titulo}</td>
                            <td className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase italic tracking-widest">Compromisso Individual</td>
                            <td className="text-right px-4 py-4 font-black text-white italic tracking-tighter">
                              R$ {Number(r.valor_original).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider italic">
                                <Calendar className="w-3.5 h-3.5 opacity-50 text-primary" />
                                {new Date(r.data_vencimento).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest italic ${
                                r.status === 'pago' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                                (new Date(r.data_vencimento) < new Date() ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20')
                              }`}>
                                {r.status === 'pago' ? 'LIQUIDADO' : (new Date(r.data_vencimento) < new Date() ? 'ATRASADO' : 'PENDENTE')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center gap-2">
                                <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 transition-all" onClick={() => setEditModal(r)} title="Manutenção"><Edit2 className="w-4 h-4" /></button>
                                <button className={`p-2.5 rounded-xl transition-all ${r.status === 'pago' ? 'opacity-20 cursor-not-allowed' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'}`} onClick={() => r.status !== 'pago' && setBaixaModal(r)} title="Efetivar Pagamento"><ArrowUpRight className="w-4 h-4" /></button>
                                <button className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500/20 transition-all" onClick={() => doDelete(r.id)} title="Excluir"><Trash2 className="w-4 h-4" /></button>
                                <button className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-primary hover:bg-primary/20 transition-all" onClick={() => setReciboModal(r)} title="Imprimir Comprovante"><Printer className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
                {/* Footer com contagem industrial */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic">
          <div>Exibindo <span className="text-white">{rows.length}</span> de <span className="text-white">{total}</span> compromissos operacionais</div>
          <div className="flex gap-2">
             <button className="btn-outline h-9 px-4 rounded-lg disabled:opacity-20 hover:text-primary transition-colors uppercase font-black italic" disabled={page === 1} onClick={() => setPage(page-1)}>Anterior</button>
             <button className="btn-outline h-9 px-4 rounded-lg disabled:opacity-20 hover:text-primary transition-colors uppercase font-black italic" disabled={page * perPage >= total} onClick={() => setPage(page+1)}>Próxima</button>
          </div>
        </div>
      </div>
    </div>

      {/* Modal Pagamento Individual */}
      <Modal isOpen={!!baixaModal} onClose={() => setBaixaModal(null)} title="Registrar Pagamento Industrial">
        <div className="min-w-[450px] p-2">
          {baixaModal && (() => {
            const hoje = new Date();
            const venc = new Date(baixaModal.data_vencimento);
            const atraso = Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24)));
            const valorAberto = Number(baixaModal.valor_aberto || 0);
            
            const multaPerc = atraso > 0 ? 0.02 : 0; 
            const jurosDiarioPerc = 0.00033; 
            const valorMulta = valorAberto * multaPerc;
            const valorJuros = valorAberto * jurosDiarioPerc * atraso;
            const valorTotal = valorAberto + valorMulta + valorJuros;

            return (
              <div className="space-y-6">
                <div className="glass-elevated p-6 rounded-xl space-y-3 bg-red-500/5 border border-red-500/20">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Valor Original</span>
                    <span className="font-bold text-white italic text-lg tracking-tighter">R$ {valorAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {atraso > 0 && (
                    <>
                      <div className="flex justify-between items-center text-red-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Multa (2% - {atraso} dias)</span>
                        <span className="font-bold italic">+ R$ {valorMulta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-red-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Juros (1%/mês)</span>
                        <span className="font-bold italic">+ R$ {valorJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                  <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                    <span className="text-[11px] font-black text-red-500 uppercase tracking-[0.2em]">Total a Debitar</span>
                    <span className="text-3xl font-black text-red-500 italic tracking-tighter">R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Conta Bancária / Débito</label>
                  <select id="conta-interna-id-pagar" className="input-base">
                    <option value="">Selecione a conta de origem...</option>
                    {contas.map(c => (
                      <option key={c.id} value={c.id}>{c.nome.toUpperCase()} - DISPONÍVEL: R$ {Number(c.saldo_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 justify-end">
                  <button className="btn-outline px-6 py-3 rounded-xl uppercase font-black italic text-xs tracking-widest" onClick={() => setBaixaModal(null)}>CANCELAR</button>
                  <button className="btn-primary px-6 py-3 rounded-xl uppercase font-black italic text-xs tracking-widest bg-red-600 border-red-600 shadow-lg shadow-red-900/20" onClick={async () => {
                    try {
                      const contaId = (document.getElementById('conta-interna-id-pagar') as HTMLSelectElement).value;
                      if (!contaId) throw new Error('Selecione uma conta');
                      
                      await api.financeiro.titulosPagar.baixar(baixaModal.id, {
                        valor_baixa: valorTotal,
                        valor_original_baixa: valorAberto,
                        valor_multa: valorMulta,
                        valor_juros: valorJuros,
                        conta_interna_id: contaId,
                        data_baixa: new Date()
                      });
                      setBaixaModal(null);
                      load(page);
                      success('Pagamento industrial registrado e saldo atualizado!');
                    } catch (err: any) {
                      error(err.message || 'Erro ao registrar pagamento');
                    }
                  }}>CONFIRMAR PAGAMENTO</button>
                </div>
              </div>
            );
          })()}
        </div>
      </Modal>

      {/* Modal Edição Individual */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Manutenção de Compromisso Industrial" width="650px">
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">Número do Título</label>
              <input 
                type="text" 
                className="input-base font-mono font-bold" 
                value={editModal?.numero_titulo || ''} 
                onChange={e => editModal && setEditModal({...editModal, numero_titulo: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">Status Operacional</label>
              <select 
                className="input-base uppercase font-bold" 
                value={editModal?.status || ''} 
                onChange={e => editModal && setEditModal({...editModal, status: e.target.value as any})}
              >
                <option value="aberto">ABERTO / PENDENTE</option>
                <option value="pago">PAGO / LIQUIDADO</option>
                <option value="cancelado">CANCELADO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">Valor Original (R$)</label>
              <input 
                type="number" 
                className="input-base font-bold italic" 
                value={editModal?.valor_original || 0} 
                onChange={e => editModal && setEditModal({...editModal, valor_original: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">Data de Vencimento</label>
              <input 
                type="date" 
                className="input-base font-bold" 
                value={editModal?.data_vencimento ? new Date(editModal.data_vencimento).toISOString().split('T')[0] : ''} 
                onChange={e => editModal && setEditModal({...editModal, data_vencimento: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">Taxa Financeira (%)</label>
              <input 
                type="number" 
                className="input-base" 
                value={editModal?.taxa_financeira || 0} 
                onChange={e => editModal && setEditModal({...editModal, taxa_financeira: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">Custo Financeiro (R$)</label>
              <input 
                type="number" 
                className="input-base" 
                value={editModal?.valor_custo_financeiro || 0} 
                onChange={e => editModal && setEditModal({...editModal, valor_custo_financeiro: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="flex gap-4 justify-end pt-6 border-t border-white/5">
            <button className="btn-outline px-8 py-3 rounded-xl uppercase font-black italic text-xs tracking-widest" onClick={() => setEditModal(null)}>CANCELAR</button>
            <button className="btn-primary px-8 py-3 rounded-xl uppercase font-black italic text-xs tracking-widest bg-red-600 border-red-600" onClick={saveEdit}>SALVAR ALTERAÇÕES</button>
          </div>
        </div>
      </Modal>

      <ReciboModal 
        isOpen={!!reciboModal} 
        onClose={() => setReciboModal(null)} 
        titulo={reciboModal as any} 
        tipo="pagar" 
        beneficiarioOuPagador={reciboModal ? suppliersMap[reciboModal.fornecedor_id] || 'Fornecedor' : ''} 
      />

      {/* Modal de Pagamento em Lote Industrial */}
      <Modal isOpen={loteModal} onClose={() => setLoteModal(false)} title={`Liquidação em Lote (${selectedIds.size} Títulos)`}>
        <div className="p-2 space-y-6">
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[11px] font-bold text-orange-400 uppercase tracking-wider italic flex items-center gap-3">
            <Layers className="w-5 h-5" />
            Atenção: Os {selectedIds.size} títulos selecionados serão baixados pelo valor nominal (em aberto).
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Conta Bancária Corporativa *</label>
              <select className="input-base uppercase font-bold" value={loteData.conta_interna_id} onChange={e => setLoteData(d => ({ ...d, conta_interna_id: e.target.value }))}>
                <option value="">Selecione a conta para débito...</option>
                {contas.map((c) => <option key={c.id} value={c.id}>{c.nome.toUpperCase()} — R$ {Number(c.saldo_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Data da Liquidação</label>
                <input type="date" className="input-base font-bold" value={loteData.data_baixa} onChange={e => setLoteData(d => ({ ...d, data_baixa: e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Observação Interna</label>
                <input type="text" className="input-base" placeholder="Motivo da baixa em lote..." value={loteData.observacoes} onChange={e => setLoteData(d => ({ ...d, observacoes: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t border-white/5">
            <button className="btn-outline px-6 py-3 rounded-xl uppercase font-black italic text-xs tracking-widest" onClick={() => setLoteModal(false)}>CANCELAR</button>
            <button className="btn-primary px-6 py-3 rounded-xl uppercase font-black italic text-xs tracking-widest bg-orange-600 border-orange-600 shadow-lg shadow-orange-900/20" onClick={handleBaixaLote} disabled={loteLoading}>
              {loteLoading ? 'PROCESSANDO...' : `CONFIRMAR PAGAMENTO EM MASSA`}
            </button>
          </div>
        </div>
      </Modal>

      {ConfirmDialogElement}
      </div>
    </div>
  );
}
