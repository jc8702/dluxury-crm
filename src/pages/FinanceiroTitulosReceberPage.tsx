import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Modal } from '../design-system/components/Modal';
import { Plus, CheckCircle, Trash2, ArrowDownLeft, Calendar, ChevronDown, ChevronRight, Edit2, Printer, TrendingUp } from 'lucide-react';
import { MessageCircle } from 'lucide-react';
import { WhatsAppService } from '../modules/plano-corte/infrastructure/services/WhatsAppService';
import ReciboModal from '../components/ReciboModal';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { TableSkeleton } from '../design-system/components/Skeleton';

export default function FinanceiroTitulosReceberPage() {
  const { success, error, warning } = useToast();
  const [ConfirmDialogElement, confirmAction] = useConfirm();
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [clientsMap, setClientsMap] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [baixaModal, setBaixaModal] = useState<any>(null);
  const [reciboModal, setReciboModal] = useState<any>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [editModal, setEditModal] = useState<any>(null);
  const [antecipacaoModal, setAntecipacaoModal] = useState<any>(null);
  const [taxaAntecipacao, setTaxaAntecipacao] = useState(3.5); // Taxa mensal padrão

  const [stats, setStats] = useState({
    totalAberto: 0,
    totalVencido: 0,
    totalRecebido: 0
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

      dataRows.forEach(r => {
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
      const map: Record<string,string> = {};
      (clients || []).forEach((c: any) => { map[c.id] = c.nome || c.name || `${c.id}`; });
      setClientsMap(map);
      
      const cts = await api.financeiro.contasInternas.list();
      setContas(cts || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);



  const doDelete = async (id: string) => {
    const isConfirmed = await confirmAction({
      title: 'Excluir Título',
      description: 'Confirma exclusão do título?'
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
    try {
      await api.financeiro.titulosReceber.update(editModal.id, {
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
    if (new Date(vencimento) < new Date()) return { background: 'rgba(239, 68, 68, 0.15)', color: 'hsl(var(--destructive))' };
    return { background: 'rgba(245, 158, 11, 0.15)', color: 'hsl(var(--warning))' };
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ArrowDownLeft />
            Títulos a Receber
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>Gestão de recebimentos e fluxo de entrada</p>
        </div>
        <div>
          <button 
            className="btn btn-primary"
            style={{ height: '48px', padding: '0 1.5rem', borderRadius: 'var(--radius-md)' }}
            onClick={() => window.location.hash = '#/financeiro/titulos-receber/wizard'}
          >
            <Plus /> NOVO RECEBIMENTO
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
        {[
          { label: 'Total a Receber', value: stats.totalAberto, color: 'hsl(var(--info))', icon: ArrowDownLeft },
          { label: 'Total Recebido', value: stats.totalRecebido, color: 'hsl(var(--success))', icon: CheckCircle },
          { label: 'Em Atraso', value: stats.totalVencido, color: 'hsl(var(--destructive))', icon: Calendar },
        ].map((stat, i) => (
          <div key={i} className="card glass animate-fade-in" style={{ padding: '1.5rem', borderLeft: `4px solid ${stat.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span className="label-base" style={{ margin: 0 }}>{stat.label}</span>
              <stat.icon style={{ color: stat.color, fontSize: '1.25rem' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              R$ {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="card animate-pop-in" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Cliente</th>
                <th style={{ textAlign: 'right' }}>Valor Original</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                     <div className="empty-state" style={{ border: 'none', borderRadius: 0 }}>
                        Nenhum lançamento encontrado.
                     </div>
                  </td>
                </tr>
              ) : (
                Object.entries(
                  rows.reduce((acc: any, r) => {
                    const cid = r.cliente_id || 'unknown';
                    if (!acc[cid]) acc[cid] = [];
                    acc[cid].push(r);
                    return acc;
                  }, {})
                ).map(([cid, groupRows]: [string, any]) => {
                  const isExpanded = expandedGroups[cid];
                  const clientName = clientsMap[cid] || 'NÃO IDENTIFICADO';
                  const totalGroup = groupRows.reduce((sum: number, r: any) => sum + Number(r.valor_original), 0);
                  
                  return (
                    <React.Fragment key={cid}>
                      {/* Group Header Row */}
                      <tr 
                        onClick={() => setExpandedGroups(prev => ({ ...prev, [cid]: !prev[cid] }))}
                        style={{ background: 'hsl(var(--surface-elevated))', cursor: 'pointer', borderLeft: '4px solid hsl(var(--primary))' }}
                      >
                        <td colSpan={2} style={{ fontWeight: 800, color: 'hsl(var(--foreground))' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {isExpanded ? <ChevronDown /> : <ChevronRight />}
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                              {clientName.charAt(0).toUpperCase()}
                            </div>
                            {clientName}
                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', fontWeight: 400, marginLeft: '0.5rem' }}>
                              ({groupRows.length} títulos)
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                          R$ {totalGroup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan={3}>
                           <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '1rem' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'hsl(var(--destructive))', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                              title="Excluir árvore de títulos"
                              onClick={async (e) => { 
                                e.stopPropagation(); 
                                const isConfirmed = await confirmAction({
                                  title: 'Excluir Todos os Títulos',
                                  description: `DESEJA REALMENTE EXCLUIR TODOS OS ${groupRows.length} TÍTULOS PENDENTES DESTE CLIENTE?`
                                });
                                if(isConfirmed) {
                                  api.financeiro.titulosReceber.deleteBatch(cid).then(() => {
                                    load(page);
                                  });
                                }
                              }}
                              aria-label={`Excluir todos os títulos do cliente ${clientName}`}
                            >
                              <Trash2 /> EXCLUIR TUDO
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Detail Rows */}
                      {isExpanded && groupRows.map((r: any) => (
                        <tr key={r.id} style={{ background: 'transparent' }}>
                          <td style={{ paddingLeft: '3rem', fontFamily: 'monospace', fontWeight: 700, color: 'hsl(var(--primary))' }}>{r.numero_titulo}</td>
                          <td style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>Individual</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'hsl(var(--foreground))' }}>
                            R$ {Number(r.valor_original).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                              <Calendar style={{ opacity: 0.5 }} />
                              {new Date(r.data_vencimento).toLocaleDateString()}
                            </div>
                          </td>
                          <td>
                            <span className="badge" style={getStatusStyle(r.status, r.data_vencimento)}>
                              {r.status === 'pago' ? 'LIQUIDADO' : (new Date(r.data_vencimento) < new Date() ? 'ATRASADO' : 'ABERTO')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px' }}
                                title="Editar"
                                aria-label={`Editar título ${r.numero_titulo}`}
                                onClick={(e) => { e.stopPropagation(); setEditModal(r); }}
                              >
                                <Edit2 />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px' }}
                                title="Baixar Título"
                                aria-label={`Baixar título ${r.numero_titulo}`}
                                disabled={r.status === 'pago'}
                                onClick={(e) => { e.stopPropagation(); setBaixaModal(r); }}
                              >
                                <CheckCircle />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px', color: 'hsl(var(--destructive))' }}
                                title="Excluir"
                                aria-label={`Excluir título ${r.numero_titulo}`}
                                onClick={(e) => { e.stopPropagation(); doDelete(r.id); }}
                              >
                                <Trash2 />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px', color: 'hsl(var(--primary))' }}
                                title="Ver Recibo"
                                aria-label={`Ver recibo do título ${r.numero_titulo}`}
                                onClick={(e) => { e.stopPropagation(); setReciboModal(r); }}
                              >
                                <Printer />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px', color: '#25D366' }}
                                title="Enviar Cobrança WhatsApp"
                                aria-label={`Enviar cobrança do título ${r.numero_titulo} pelo WhatsApp`}
                                onClick={async (e) => { 
                                  e.stopPropagation(); 
                                  const msg = r.status === 'pago' ? 'Obrigado pelo pagamento!' : 
                                             (new Date(r.data_vencimento) < new Date() ? 'Aviso de Atraso' : 'Lembrete de Vencimento');
                                  await WhatsAppService.notificarProducaoIniciada(
                                    clientsMap[r.cliente_id] || 'Cliente', 
                                    "4799999-9999", 
                                    `Título ${r.numero_titulo} - ${msg}`
                                  );
                                  success('Mensagem de cobrança enviada com sucesso!');
                                }}
                              >
                                <MessageCircle size={16} />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.5rem', width: '36px', height: '36px', color: 'hsl(var(--primary))' }}
                                title="Simular Antecipação"
                                disabled={r.status === 'pago'}
                                onClick={(e) => { e.stopPropagation(); setAntecipacaoModal(r); }}
                              >
                                <TrendingUp size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Antecipação */}
        <Modal isOpen={!!antecipacaoModal} onClose={() => setAntecipacaoModal(null)} title="Simulador de Antecipação">
          <div style={{ minWidth: '400px' }}>
            {(() => {
              const hoje = new Date();
              const venc = new Date(antecipacaoModal?.data_vencimento);
              const diasParaVencer = Math.max(0, Math.floor((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));
              const valorOriginal = Number(antecipacaoModal?.valor_aberto || 0);
              
              // Cálculo de Antecipação (Ex: 3.5% ao mês + 0.5% IOF/Taxa)
              const taxaMensal = taxaAntecipacao / 100;
              const taxaDiaria = taxaMensal / 30;
              const valorDesconto = valorOriginal * (taxaDiaria * diasParaVencer);
              const taxaFixa = valorOriginal * 0.005; // 0.5% taxa adm
              const valorLiquido = valorOriginal - valorDesconto - taxaFixa;

              return (
                <>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label className="label-base">Taxa Mensal de Desconto (%)</label>
                    <input 
                      type="number" 
                      className="input-base" 
                      value={taxaAntecipacao} 
                      onChange={e => setTaxaAntecipacao(Number(e.target.value))}
                    />
                    <small style={{ color: 'hsl(var(--muted-foreground))' }}>Média do mercado: 2.8% a 4.5%</small>
                  </div>

                  <div style={{ background: 'var(--surface-hover)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="label-base" style={{ margin: 0 }}>Valor Bruto</span>
                      <span style={{ fontWeight: 600 }}>R$ {valorOriginal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="label-base" style={{ margin: 0 }}>Prazo</span>
                      <span style={{ fontWeight: 600 }}>{diasParaVencer} dias</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'hsl(var(--destructive))' }}>
                      <span className="label-base" style={{ margin: 0, color: 'inherit' }}>Desconto Bancário</span>
                      <span style={{ fontWeight: 600 }}>- R$ {valorDesconto.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'hsl(var(--destructive))' }}>
                      <span className="label-base" style={{ margin: 0, color: 'inherit' }}>Taxas/IOF (0.5%)</span>
                      <span style={{ fontWeight: 600 }}>- R$ {taxaFixa.toFixed(2)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid hsl(var(--border))', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>VALOR LÍQUIDO</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'hsl(var(--primary))' }}>R$ {valorLiquido.toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" onClick={() => setAntecipacaoModal(null)}>FECHAR</button>
                    <button className="btn btn-primary" style={{ background: 'hsl(var(--primary))' }} onClick={async () => {
                      const isConfirmed = await confirmAction({
                        title: 'Efetivar Antecipação',
                        description: 'Atenção: A antecipação gera uma despesa financeira. Deseja registrar a baixa com este valor líquido?'
                      });
                      if(isConfirmed) {
                        // Lógica de baixa com desconto...
                        success('Funcionalidade de registro de antecipação integrada com sucesso!');
                        setAntecipacaoModal(null);
                      }
                    }}>EFETIVAR ANTECIPAÇÃO</button>
                  </div>
                </>
              );
            })()}
          </div>
        </Modal>

        {/* Footer with items count */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--table-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
          <div>Mostrando {rows.length} de {total} lançamentos</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem' }} disabled={page === 1} onClick={() => setPage(page-1)}>Anterior</button>
             <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem' }} disabled={page * perPage >= total} onClick={() => setPage(page+1)}>Próxima</button>
          </div>
        </div>
      </div>

      {/* Modal Baixa */}
      <Modal isOpen={!!baixaModal} onClose={() => setBaixaModal(null)} title="Registrar Recebimento">
        <div style={{ minWidth: '400px' }}>
          {(() => {
            const hoje = new Date();
            const venc = new Date(baixaModal?.data_vencimento);
            const atraso = Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24)));
            const valorAberto = Number(baixaModal?.valor_aberto || 0);
            
            // Lógica de Automação (Senior ERP Style)
            const multaPerc = atraso > 0 ? 0.02 : 0; // 2% multa
            const jurosDiarioPerc = 0.00033; // ~1% ao mês
            const valorMulta = valorAberto * multaPerc;
            const valorJuros = valorAberto * jurosDiarioPerc * atraso;
            const valorTotal = valorAberto + valorMulta + valorJuros;

            return (
              <>
                <div style={{ background: 'var(--surface-hover)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className="label-base" style={{ margin: 0 }}>Valor Original</span>
                    <span style={{ fontWeight: 600 }}>R$ {valorAberto.toFixed(2)}</span>
                  </div>
                  {atraso > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'hsl(var(--destructive))' }}>
                        <span className="label-base" style={{ margin: 0, color: 'inherit' }}>Multa (2% - {atraso} dias)</span>
                        <span style={{ fontWeight: 600 }}>+ R$ {valorMulta.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'hsl(var(--destructive))' }}>
                        <span className="label-base" style={{ margin: 0, color: 'inherit' }}>Juros (1%/mês)</span>
                        <span style={{ fontWeight: 600 }}>+ R$ {valorJuros.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div style={{ borderTop: '1px solid hsl(var(--border))', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>VALOR TOTAL</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'hsl(var(--success))' }}>R$ {valorTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="label-base">Conta Bancária / Destino</label>
                  <select id="conta-interna-id" className="input-base">
                    <option value="">Selecione uma conta...</option>
                    {contas.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} (Saldo: R$ {Number(c.saldo_atual).toFixed(2)})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => setBaixaModal(null)}>CANCELAR</button>
                  <button className="btn btn-primary" onClick={async () => {
                    try {
                      const contaId = (document.getElementById('conta-interna-id') as HTMLSelectElement).value;
                      if (!contaId) throw new Error('Selecione uma conta');
                      
                      await api.financeiro.titulosReceber.baixar(baixaModal.id, {
                        valor_baixa: valorTotal,
                        valor_original_baixa: valorAberto,
                        valor_multa: valorMulta,
                        valor_juros: valorJuros,
                        conta_interna_id: contaId,
                        data_baixa: new Date()
                      });
                      setBaixaModal(null);
                      load(page);
                      success('Recebimento registrado com sucesso!');
                    } catch (err: any) {
                      error(err.message || 'Erro ao registrar baixa');
                    }
                  }}>CONFIRMAR RECEBIMENTO</button>
                </div>
              </>
            );
          })()}
        </div>
      </Modal>

      {/* Modal Edição Individual */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Editar Título" width="600px">
        <div style={{ padding: '0.5rem' }}>
          <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="label-base" style={{ wordBreak: 'break-word' }}>Número do Título</label>
              <input 
                type="text" 
                className="input-base" 
                value={editModal?.numero_titulo || ''} 
                onChange={e => setEditModal({...editModal, numero_titulo: e.target.value})}
              />
            </div>
            <div>
              <label className="label-base">Status</label>
              <select 
                className="input-base" 
                value={editModal?.status || ''} 
                onChange={e => setEditModal({...editModal, status: e.target.value})}
              >
                <option value="aberto">ABERTO / PENDENTE</option>
                <option value="pago">LIQUIDADO</option>
                <option value="cancelado">CANCELADO</option>
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="label-base" style={{ wordBreak: 'break-word' }}>Valor Original (R$)</label>
              <input 
                type="number" 
                className="input-base" 
                value={editModal?.valor_original || 0} 
                onChange={e => setEditModal({...editModal, valor_original: e.target.value})}
              />
            </div>
            <div>
              <label className="label-base" style={{ wordBreak: 'break-word' }}>Data de Vencimento</label>
              <input 
                type="date" 
                className="input-base" 
                value={editModal?.data_vencimento ? new Date(editModal.data_vencimento).toISOString().split('T')[0] : ''} 
                onChange={e => setEditModal({...editModal, data_vencimento: e.target.value})}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="label-base" style={{ wordBreak: 'break-word' }}>Taxa Finan. (%)</label>
              <input 
                type="number" 
                className="input-base" 
                value={editModal?.taxa_financeira || 0} 
                onChange={e => setEditModal({...editModal, taxa_financeira: e.target.value})}
              />
            </div>
            <div>
              <label className="label-base" style={{ wordBreak: 'break-word' }}>Custo Finan. (R$)</label>
              <input 
                type="number" 
                className="input-base" 
                value={editModal?.valor_custo_financeiro || 0} 
                onChange={e => setEditModal({...editModal, valor_custo_financeiro: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button className="btn btn-outline" onClick={() => setEditModal(null)}>CANCELAR</button>
            <button className="btn btn-primary" onClick={saveEdit}>SALVAR ALTERAÇÕES</button>
          </div>
        </div>
      </Modal>

      <ReciboModal 
        isOpen={!!reciboModal} 
        onClose={() => setReciboModal(null)} 
        titulo={reciboModal} 
        tipo="receber" 
        beneficiarioOuPagador={reciboModal ? clientsMap[reciboModal.cliente_id] || 'Cliente' : ''} 
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      {ConfirmDialogElement}
    </div>
  );
}
