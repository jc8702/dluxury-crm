import { useEffect, useState, useMemo } from 'react';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../context/ToastContext';
import { Modal } from '../design-system/components/Modal';
import { TableSkeleton } from '../design-system/components/Skeleton';
import { api } from '../lib/api';
import { 
  Download, Filter, RefreshCw, Plus, Edit2, 
  FileText, Search, X, Repeat, AlertCircle, 
  Trash2, Lock, ArrowUpCircle, ArrowDownCircle,
  History, Wallet, Building2, Banknote, TrendingUp, TrendingDown,
  ChevronRight, Calendar, Info
} from 'lucide-react';
import { 
  ContaInterna, 
  MovimentacaoExtrato, 
  ExtratoPayload, 
  Fechamento, 
  FormTransferencia,
  TipoContaInterna
} from '../modules/financeiro/domain/types';

interface ContaForm {
  nome: string;
  tipo: TipoContaInterna;
  banco_codigo: string;
  agencia: string;
  conta: string;
  saldo_inicial: number;
}

const FinanceiroContasPage = () => {
  const [ConfirmDialogElement, confirm] = useConfirm();
  const { success, error } = useToast();
  
  const [contas, setContas] = useState<ContaInterna[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ContaInterna | null>(null);
  
  const [form, setForm] = useState<ContaForm>({ 
    nome: '', 
    tipo: 'conta_corrente', 
    banco_codigo: '', 
    agencia: '', 
    conta: '', 
    saldo_inicial: 0 
  });
  
  // Extrato state
  const [extrato, setExtrato] = useState<ExtratoPayload | null>(null);
  const [showExtrato, setShowExtrato] = useState(false);
  const [extratoLoading, setExtratoLoading] = useState(false);
  const [extratoContaNome, setExtratoContaNome] = useState('');
  
  // Filtros do extrato
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [filtroBusca, setFiltroBusca] = useState('');

  // Transferência
  const [showTransferencia, setShowTransferencia] = useState(false);
  const [transferForm, setTransferForm] = useState<FormTransferencia>({
    conta_origem_id: '',
    conta_destino_id: '',
    valor: '',
    data_movimento: new Date().toISOString().split('T')[0],
    descricao: ''
  });
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferErro, setTransferErro] = useState('');
  
  // Fechamentos
  const [showFechamento, setShowFechamento] = useState(false);
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [fechamentoForm, setFechamentoForm] = useState({ 
    mes: new Date().getMonth() + 1, 
    ano: new Date().getFullYear(), 
    status: 'fechado' as const, 
    observacoes: '' 
  });

  const normalizeList = (value: any) => (Array.isArray(value) ? value : value?.data || []);

  const fetchContas = async () => { 
    setLoading(true); 
    try { 
      const res = await api.financeiro.contasInternas.list(); 
      setContas(res || []); 
    } catch(e) { 
      console.error(e); 
    } 
    setLoading(false); 
  };
  
  useEffect(() => { fetchContas(); }, []);

  const fetchFechamentos = async () => {
    try {
      const res = await api.financeiro.fechamentos.list();
      setFechamentos(normalizeList(res));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (showFechamento) fetchFechamentos();
  }, [showFechamento]);

  const saveFechamento = async () => {
    try {
      await api.financeiro.fechamentos.save(fechamentoForm);
      fetchFechamentos();
      success('Período atualizado com sucesso!');
    } catch (e: any) { error(e.message || 'Erro ao salvar fechamento'); }
  };

  const openNew = () => { 
    setEditing(null); 
    setForm({ nome: '', tipo: 'conta_corrente', banco_codigo: '', agencia: '', conta: '', saldo_inicial: 0 }); 
    setIsOpen(true); 
  };
  
  const openEdit = (c: ContaInterna) => { 
    setEditing(c); 
    setForm({ nome: c.nome, tipo: c.tipo, banco_codigo: c.banco_codigo || '', agencia: c.agencia || '', conta: c.conta || '', saldo_inicial: c.saldo_inicial }); 
    setIsOpen(true); 
  };

  const save = async () => {
    try {
      if (editing) await api.financeiro.contasInternas.update({ id: editing.id, ...form });
      else await api.financeiro.contasInternas.create(form);
      setIsOpen(false); fetchContas();
      success('Conta salva com sucesso!');
    } catch (e: any) { error(e.message || 'Erro ao salvar conta'); }
  };

  const doDelete = async (id: string, nome: string) => {
    const isConfirmed = await confirm({
      title: 'EXCLUIR CONTA',
      description: `CONFIRMA A EXCLUSÃO DA CONTA "${nome.toUpperCase()}"?\nESTA OPERAÇÃO É IRREVERSÍVEL.`
    });
    if (!isConfirmed) return;
    try {
      await api.financeiro.contasInternas.delete(id);
      fetchContas();
      success('Conta removida do sistema.');
    } catch (e: any) { error(e.message || 'Falha ao excluir'); }
  };

  const openExtrato = async (conta: ContaInterna) => {
    setExtratoContaNome(conta.nome);
    setExtratoLoading(true);
    setShowExtrato(true);
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroTipo('todos');
    setFiltroBusca('');
    try {
      const token = localStorage.getItem('dluxury_token') || '';
      const res = await window.fetch(`/api/financeiro/contas-internas?action=extrato&id=${conta.id}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      const payload = json.data ?? json;
      setExtrato(payload);
    } catch (e) { 
      console.error('Erro ao carregar extrato:', e); 
      setExtrato(null);
    }
    setExtratoLoading(false);
  };

  const extratoFiltrado = useMemo(() => {
    if (!extrato?.extrato) return [];
    let items = [...extrato.extrato];
    
    if (filtroDataInicio) {
      const inicio = new Date(filtroDataInicio);
      items = items.filter(m => new Date(m.data) >= inicio);
    }
    if (filtroDataFim) {
      const fim = new Date(filtroDataFim + 'T23:59:59');
      items = items.filter(m => new Date(m.data) <= fim);
    }
    if (filtroTipo === 'entrada') {
      items = items.filter(m => Number(m.valor) > 0);
    } else if (filtroTipo === 'saida') {
      items = items.filter(m => Number(m.valor) < 0);
    }
    if (filtroBusca.trim()) {
      const q = filtroBusca.toUpperCase();
      items = items.filter(m => 
        (m.descricao || '').toUpperCase().includes(q) || 
        (m.tipo || '').toUpperCase().includes(q) ||
        (m.origem || '').toUpperCase().includes(q)
      );
    }
    return items;
  }, [extrato, filtroDataInicio, filtroDataFim, filtroTipo, filtroBusca]);

  const extratoTotais = useMemo(() => {
    let entradas = 0, saidas = 0;
    extratoFiltrado.forEach(m => {
      const v = Number(m.valor);
      if (v > 0) entradas += v;
      else saidas += Math.abs(v);
    });
    return { entradas, saidas, liquido: entradas - saidas, qtd: extratoFiltrado.length };
  }, [extratoFiltrado]);

  const exportCSV = () => {
    const header = 'Data;Descri\u00e7\u00e3o;Tipo;Origem;Valor;Saldo\n';
    const rows = extratoFiltrado.map(m =>
      `${new Date(m.data).toLocaleDateString('pt-BR')};${m.descricao || m.tipo};${m.tipo};${m.origem};${Number(m.valor).toFixed(2)};${Number(m.saldo_momento).toFixed(2)}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `extrato_${extratoContaNome}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const doTransferencia = async () => {
    setTransferErro('');
    if (!transferForm.conta_origem_id || !transferForm.conta_destino_id) {
      setTransferErro('Selecione a conta de origem e destino.'); return;
    }
    if (transferForm.conta_origem_id === transferForm.conta_destino_id) {
      setTransferErro('Origem e destino n\u00e3o podem ser a mesma conta.'); return;
    }
    if (!transferForm.valor || Number(transferForm.valor) <= 0) {
      setTransferErro('Informe um valor v\u00e1lido.'); return;
    }
    setTransferLoading(true);
    try {
      const token = localStorage.getItem('dluxury_token') || '';
      const res = await window.fetch('/api/financeiro/tesouraria?action=transferencia', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...transferForm, valor: Number(transferForm.valor) })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Erro na transfer\u00eancia');
      setShowTransferencia(false);
      setTransferForm({ conta_origem_id: '', conta_destino_id: '', valor: '', data_movimento: new Date().toISOString().split('T')[0], descricao: '' });
      fetchContas();
      success('Transferência realizada com sucesso!');
    } catch(e: any) {
      setTransferErro(e.message || 'Erro ao realizar transfer\u00eancia');
    }
    setTransferLoading(false);
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in pb-20">
      <ConfirmDialogElement />

      {/* Header Industrial */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
              <Wallet className="text-primary w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Tesouraria Corporativa</span>
          </div>
          <h1 className="text-5xl font-black italic tracking-tighter">
            CONTAS <span className="text-primary underline decoration-primary/30 underline-offset-8">INTERNAS</span>
          </h1>
          <p className="text-muted-foreground mt-4 font-medium max-w-xl leading-relaxed">
            Consolidação de saldos bancários, caixas operacionais e investimentos. Gestão de liquidez em tempo real com auditoria de extratos.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-outline h-12 px-6 group" onClick={fetchContas}>
            <RefreshCw className={`w-4 h-4 mr-2 transition-transform group-hover:rotate-180 ${loading ? 'animate-spin' : ''}`} /> ATUALIZAR
          </button>
          <button 
            className="btn btn-outline h-12 px-6 border-blue-500/30 text-blue-400 hover:bg-blue-500/10" 
            onClick={() => { setTransferErro(''); setShowTransferencia(true); }}
            disabled={contas.length < 2}
          >
            <Repeat className="w-4 h-4 mr-2" /> TRANSFERIR
          </button>
          <button 
            className="btn btn-outline h-12 px-6 border-orange-500/30 text-orange-400 hover:bg-orange-500/10" 
            onClick={() => setShowFechamento(true)}
          >
            <Lock className="w-4 h-4 mr-2" /> FECHAMENTOS
          </button>
          <button className="btn btn-primary h-12 px-8 font-black italic tracking-tight shadow-lg shadow-primary/20" onClick={openNew}>
            <Plus className="w-5 h-5 mr-2" /> NOVA CONTA
          </button>
        </div>
      </div>

      {/* Grid de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-elevated p-8 rounded-[2rem] border border-white/5 h-64 animate-pulse" />
          ))
        ) : contas.length === 0 ? (
          <div className="col-span-full glass-elevated p-32 text-center rounded-[3rem] border border-dashed border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50" />
            <div className="relative z-10">
              <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-8 border border-primary/20">
                <Building2 className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black italic tracking-tight mb-3">TESOURARIA VAZIA</h3>
              <p className="text-muted-foreground mb-10 max-w-md mx-auto font-medium">
                Sua infraestrutura financeira ainda não possui contas ativas. Configure seus caixas ou contas bancárias para iniciar a gestão.
              </p>
              <button className="btn btn-primary px-12 h-14 font-black italic" onClick={openNew}>ADICIONAR PRIMEIRA CONTA</button>
            </div>
          </div>
        ) : contas.map(c => {
          const isPos = Number(c.saldo_atual || 0) >= 0;
          return (
            <div key={c.id} className="glass-elevated group hover:border-primary/40 transition-all duration-500 rounded-[2.5rem] overflow-hidden flex flex-col h-full border border-white/5 relative">
              {/* Status Glow */}
              <div className={`absolute -right-10 -top-10 w-32 h-32 blur-[60px] rounded-full opacity-10 transition-opacity group-hover:opacity-20 ${isPos ? 'bg-emerald-500' : 'bg-red-500'}`} />
              
              <div className="p-8 flex-1 relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border ${
                        c.tipo === 'caixa' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                        c.tipo === 'aplicacao' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                        'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}>
                        {c.tipo?.replace(/_/g, ' ')}
                      </span>
                      {c.banco_codigo && <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">BCO: {c.banco_codigo}</span>}
                    </div>
                    <h3 className="text-2xl font-black italic tracking-tighter group-hover:text-primary transition-colors truncate max-w-[220px] mt-2">
                      {c.nome}
                    </h3>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-primary font-black text-2xl shadow-inner group-hover:border-primary/30 transition-all">
                    {(c.nome || 'C').charAt(0)}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic mb-1 flex items-center gap-2">
                      SALDO DISPONÍVEL <ChevronRight className="w-3 h-3 text-primary opacity-50" />
                    </div>
                    <div className={`text-4xl font-black tracking-tighter italic ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmt(Number(c.saldo_atual || 0))}
                    </div>
                  </div>

                  {c.agencia && (
                    <div className="flex gap-4 pt-4 border-t border-white/5">
                      <div className="flex-1">
                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Agência</div>
                        <div className="text-sm font-mono font-black">{c.agencia}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Conta</div>
                        <div className="text-sm font-mono font-black">{c.conta}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex border-t border-white/5 bg-black/40 p-2 gap-2">
                <button 
                  className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                  onClick={() => openEdit(c)}
                >
                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" /> EDITAR
                </button>
                <button 
                  className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                  onClick={() => openExtrato(c)}
                >
                  <History className="w-4 h-4" /> EXTRATO
                </button>
                <button 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all"
                  onClick={() => doDelete(c.id, c.nome)}
                  title="EXCLUIR CONTA"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nova/Editar Conta */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? 'REVISÃO DE CONTA' : 'ABERTURA DE CONTA'} width="600px">
        <div className="space-y-8 p-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2 block italic">IDENTIFICAÇÃO OPERACIONAL</label>
            <input 
              className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none focus:border-primary/50 transition-all shadow-inner" 
              value={form.nome} 
              onChange={e => setForm({...form, nome: e.target.value})} 
              placeholder="Ex: ITAÚ EMPRESARIAL" 
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic">TIPO DE ATIVO</label>
              <div className="relative">
                <select 
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all appearance-none font-bold" 
                  value={form.tipo} 
                  onChange={e => setForm({...form, tipo: e.target.value as TipoContaInterna})}
                >
                  <option value="conta_corrente">CONTA CORRENTE</option>
                  <option value="poupanca">POUPANÇA</option>
                  <option value="caixa">CAIXA INTERNO</option>
                  <option value="aplicacao">APLICAÇÃO/INVESTIMENTO</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-primary pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic">CÓDIGO BANCO</label>
              <input 
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all font-mono font-bold" 
                value={form.banco_codigo} 
                onChange={e => setForm({...form, banco_codigo: e.target.value})} 
                placeholder="Ex: 341, 001..." 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic">AGÊNCIA</label>
              <input 
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all font-mono font-bold" 
                placeholder="0001" 
                value={form.agencia} 
                onChange={e => setForm({...form, agencia: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic">NÚMERO DA CONTA</label>
              <input 
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all font-mono font-bold" 
                placeholder="12345-6" 
                value={form.conta} 
                onChange={e => setForm({...form, conta: e.target.value})} 
              />
            </div>
          </div>

          {!editing && (
            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3 block italic text-center">APORTE INICIAL DE CAPITAL</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary opacity-50">R$</span>
                <input 
                  type="number" 
                  className="w-full bg-black/40 border border-primary/20 rounded-2xl pl-14 pr-6 py-5 text-3xl font-black focus:outline-none focus:border-primary transition-all font-mono text-primary italic tracking-tighter" 
                  value={form.saldo_inicial} 
                  onChange={e => setForm({...form, saldo_inicial: Number(e.target.value)})} 
                />
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button className="flex-1 btn btn-outline h-14 font-black italic" onClick={() => setIsOpen(false)}>DESCARTAR</button>
            <button className="flex-[2] btn btn-primary h-14 font-black italic text-lg" onClick={save}>FINALIZAR CONFIGURAÇÃO</button>
          </div>
        </div>
      </Modal>

      {/* Modal Transferência */}
      <Modal isOpen={showTransferencia} onClose={() => setShowTransferencia(false)} title="MOVIMENTAÇÃO DE TESOURARIA" width="600px">
        <div className="space-y-8 p-4">
          <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-[2rem] flex gap-4 items-start">
            <Info className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
            <p className="text-[11px] text-blue-200/70 font-medium leading-relaxed uppercase tracking-wider">
              <strong>Transferência entre contas:</strong> O valor será debitado da origem e creditado no destino instantaneamente, gerando lançamentos auditáveis em ambos os extratos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-primary/20 border border-primary/40 rounded-full flex items-center justify-center z-10 hidden md:flex">
               <ChevronRight className="w-5 h-5 text-primary" />
             </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic text-center">CONTA ORIGEM</label>
              <select 
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all appearance-none font-bold text-center h-20" 
                value={transferForm.conta_origem_id}
                onChange={e => setTransferForm({...transferForm, conta_origem_id: e.target.value})}
              >
                <option value="">SELECIONAR...</option>
                {contas.map(c => (
                  <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic text-center">CONTA DESTINO</label>
              <select 
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all appearance-none font-bold text-center h-20" 
                value={transferForm.conta_destino_id}
                onChange={e => setTransferForm({...transferForm, conta_destino_id: e.target.value})}
              >
                <option value="">SELECIONAR...</option>
                {contas.filter(c => c.id !== transferForm.conta_origem_id).map(c => (
                  <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2 block italic text-center">VALOR DO REPASSE</label>
              <input 
                type="number" 
                className="w-full bg-transparent border-b-2 border-primary/30 rounded-none text-center text-3xl font-black focus:outline-none focus:border-primary transition-all font-mono text-primary italic tracking-tighter" 
                value={transferForm.valor}
                onChange={e => setTransferForm({...transferForm, valor: e.target.value})}
                placeholder="0,00"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic">DATA DA OPERAÇÃO</label>
              <div className="relative">
                <input 
                  type="date" 
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all font-bold" 
                  value={transferForm.data_movimento}
                  onChange={e => setTransferForm({...transferForm, data_movimento: e.target.value})}
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic">MEMORIAL DESCRITIVO / OBSERVAÇÃO</label>
            <input 
              className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all font-bold" 
              placeholder="EX: REFORÇO DE CAIXA, PAGAMENTO DE TAXAS..."
              value={transferForm.descricao}
              onChange={e => setTransferForm({...transferForm, descricao: e.target.value})}
            />
          </div>

          {transferErro && (
            <div className="flex items-center gap-4 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-black uppercase tracking-widest italic animate-bounce">
              <AlertCircle className="w-5 h-5 shrink-0" /> {transferErro}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button className="flex-1 btn btn-outline h-14 font-black italic" onClick={() => setShowTransferencia(false)}>DESCARTAR</button>
            <button 
              className="flex-[2] btn btn-primary h-14 font-black italic text-lg shadow-lg shadow-primary/20" 
              onClick={doTransferencia}
              disabled={transferLoading}
            >
              {transferLoading ? 'PROCESSANDO...' : 'EXECUTAR TRANSFERÊNCIA'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Extrato */}
      <Modal isOpen={showExtrato} onClose={() => setShowExtrato(false)} title={`EXTRATO ANALÍTICO — ${extratoContaNome.toUpperCase()}`} width="1300px">
        {extratoLoading ? (
          <div className="h-[600px] p-8 space-y-8 animate-pulse">
            <div className="grid grid-cols-4 gap-4 h-32 bg-white/5 rounded-3xl" />
            <div className="h-full bg-white/5 rounded-3xl" />
          </div>
        ) : (
          <div className="space-y-10 p-4">
            {/* Resumo Industrial */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Saldo Anterior', value: extrato?.saldo_inicial || 0, color: 'text-white/60', border: 'border-white/10', icon: <History className="w-4 h-4" /> },
                { label: 'Total Entradas', value: extratoTotais.entradas, color: 'text-emerald-500', border: 'border-emerald-500/30', icon: <ArrowUpCircle className="w-4 h-4" /> },
                { label: 'Total Saídas', value: extratoTotais.saidas, color: 'text-red-500', border: 'border-red-500/30', icon: <ArrowDownCircle className="w-4 h-4" />, isNeg: true },
                { label: 'Saldo Projetado', value: extrato?.conta?.saldo_atual || 0, color: 'text-primary', border: 'border-primary/40', icon: <TrendingUp className="w-4 h-4" />, highlight: true },
              ].map((card, i) => (
                <div key={i} className={`glass-elevated p-6 rounded-[2rem] border-l-4 ${card.border} relative overflow-hidden`}>
                  {card.highlight && <div className="absolute inset-0 bg-primary/5" />}
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic mb-3 flex items-center gap-2">
                    {card.icon} {card.label}
                  </p>
                  <p className={`text-2xl font-black italic tracking-tighter ${card.color}`}>
                    {card.isNeg ? '- ' : card.value > 0 && i !== 0 && i !== 3 ? '+ ' : ''}{fmt(card.value)}
                  </p>
                </div>
              ))}
            </div>

            {/* Filtros e Ações */}
            <div className="flex flex-col xl:flex-row gap-6 items-end bg-black/20 p-8 rounded-[2.5rem] border border-white/5">
              <div className="flex-1 w-full space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic ml-2">PESQUISA DINÂMICA</label>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-50" />
                  <input 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all" 
                    placeholder="Filtrar por descrição, origem ou tipo de operação..."
                    value={filtroBusca}
                    onChange={e => setFiltroBusca(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full md:w-64 space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic ml-2">FLUXO</label>
                <div className="relative">
                  <select 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black italic appearance-none focus:outline-none focus:border-primary/50 uppercase"
                    value={filtroTipo}
                    onChange={e => setFiltroTipo(e.target.value as any)}
                  >
                    <option value="todos">TODOS OS LANÇAMENTOS</option>
                    <option value="entrada">ENTRADAS (+) </option>
                    <option value="saida">SAÍDAS (-) </option>
                  </select>
                  <Filter className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-50 pointer-events-none" />
                </div>
              </div>
              <div className="flex gap-3">
                <button className="btn btn-outline h-[58px] px-8 font-black italic tracking-widest group" onClick={exportCSV}>
                  <Download className="w-5 h-5 mr-2 group-hover:-translate-y-1 transition-transform" /> CSV
                </button>
                <button className="btn btn-primary h-[58px] px-8 font-black italic tracking-widest" onClick={() => window.print()}>
                  <FileText className="w-5 h-5 mr-2" /> PDF
                </button>
              </div>
            </div>

            {/* Tabela de Extrato */}
            <div className="glass-elevated rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl relative">
              <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#0A0A0A] z-20">
                    <tr className="border-b border-white/10">
                      <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">Data de Efetivação</th>
                      <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">Memorial / Descrição</th>
                      <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">Módulo Origem</th>
                      <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic text-right">Valor Operacional</th>
                      <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic text-right">Saldo Progressivo</th>
                      <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic text-center">Auditoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {extratoFiltrado.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-32 text-center">
                          <Info className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                          <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em] italic">Nenhum lançamento identificado para os filtros aplicados</p>
                        </td>
                      </tr>
                    ) : extratoFiltrado.map((m, i) => {
                      const isPos = Number(m.valor) > 0;
                      return (
                        <tr key={m.id || i} className={`group transition-colors hover:bg-white/[0.02] ${m.conferido ? 'opacity-40 grayscale' : ''}`}>
                          <td className="px-8 py-5 text-xs font-mono font-bold tracking-widest text-muted-foreground">{new Date(m.data).toLocaleDateString('pt-BR')}</td>
                          <td className="px-8 py-5">
                            <div className="text-sm font-black italic tracking-tight group-hover:text-primary transition-colors">{m.descricao || m.tipo}</div>
                            <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">{m.tipo}</div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-[10px] font-black bg-primary/5 border border-primary/20 px-3 py-1 rounded-lg text-primary italic uppercase tracking-wider">{m.origem}</span>
                          </td>
                          <td className={`px-8 py-5 text-right font-black font-mono text-base tracking-tighter ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPos ? '+' : '-'} {fmt(Math.abs(Number(m.valor)))}
                          </td>
                          <td className="px-8 py-5 text-right font-bold font-mono text-xs text-muted-foreground/60">
                            {fmt(Number(m.saldo_momento))}
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex justify-center">
                              <button 
                                onClick={() => {
                                  api.financeiro.conferencia.toggle({ id: m.id, origem: m.origem, conferido: !m.conferido })
                                    .then(() => {
                                      const newExtrato = { ...extrato! };
                                      const item = newExtrato.extrato.find(it => it.id === m.id);
                                      if (item) item.conferido = !m.conferido;
                                      setExtrato(newExtrato);
                                      success(m.conferido ? 'CONFERÊNCIA REVOGADA' : 'LANÇAMENTO AUDITADO');
                                    });
                                }}
                                className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center group/check ${m.conferido ? 'bg-emerald-500 border-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'border-white/10 hover:border-primary/50'}`}
                              >
                                {m.conferido ? <X className="w-5 h-5 font-black" /> : <ChevronRight className="w-5 h-5 opacity-0 group-hover/check:opacity-100 transition-opacity" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button className="btn btn-primary px-16 h-14 font-black italic text-lg" onClick={() => setShowExtrato(false)}>FECHAR AUDITORIA</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Fechamentos */}
      <Modal isOpen={showFechamento} onClose={() => setShowFechamento(false)} title="FECHAMENTOS DE CICLO" width="750px">
        <div className="space-y-10 p-4">
          <div className="bg-orange-500/5 border border-orange-500/20 p-8 rounded-[2.5rem] flex gap-6 items-start relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
            <AlertCircle className="w-10 h-10 text-orange-500 shrink-0 mt-1 animate-pulse" />
            <div className="relative z-10">
              <h4 className="text-base font-black text-orange-400 mb-2 italic uppercase tracking-widest">PROTOCOLO DE SEGURANÇA</h4>
              <p className="text-xs text-orange-200/60 font-medium leading-relaxed uppercase tracking-widest">
                O fechamento de período é uma ação crítica que <strong>BLOQUEIA</strong> permanentemente qualquer alteração em lançamentos retroativos. Certifique-se de que todas as contas foram auditadas e conferidas antes de selar o mês.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end bg-black/40 p-8 rounded-[2.5rem] border border-white/5 shadow-inner">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground mb-1 block tracking-[0.3em] italic ml-2">MÊS DE REFERÊNCIA</label>
              <div className="relative">
                <select 
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 appearance-none font-black italic uppercase text-sm"
                  value={fechamentoForm.mes}
                  onChange={e => setFechamentoForm({...fechamentoForm, mes: Number(e.target.value)})}
                >
                  {Array.from({length: 12}).map((_, i) => (
                    <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('pt-BR', {month: 'long'}).toUpperCase()}</option>
                  ))}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-primary pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground mb-1 block tracking-[0.3em] italic ml-2">ANO BASE</label>
              <div className="relative">
                <select 
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 appearance-none font-black text-sm"
                  value={fechamentoForm.ano}
                  onChange={e => setFechamentoForm({...fechamentoForm, ano: Number(e.target.value)})}
                >
                  {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-primary pointer-events-none" />
              </div>
            </div>
            <button className="btn btn-primary h-[58px] font-black italic tracking-tight text-base" onClick={saveFechamento}>EFETUAR LACRE</button>
          </div>

          <div>
            <h4 className="text-[11px] font-black mb-6 flex items-center gap-3 uppercase tracking-[0.3em] text-muted-foreground italic">
              <Lock className="w-4 h-4 text-primary" /> LINHA DO TEMPO DE SEGURANÇA
            </h4>
            <div className="glass-elevated rounded-[2rem] overflow-hidden border border-white/5">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase italic tracking-widest">Ciclo Mensal</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase italic tracking-widest">Status de Integridade</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase italic tracking-widest text-right">Ações de Gestor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {fechamentos.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-12 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest italic opacity-50">Nenhum ciclo fechado identificado</td>
                    </tr>
                  ) : fechamentos.map(f => (
                    <tr key={f.id} className="hover:bg-white/[0.02] group transition-colors">
                      <td className="px-8 py-5 font-black italic tracking-tight text-base capitalize">
                        {new Date(2000, f.mes-1).toLocaleString('pt-BR', {month: 'long'})} <span className="text-primary">/ {f.ano}</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border ${
                          f.status === 'fechado' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          className="text-[10px] font-black text-primary hover:text-white uppercase tracking-widest italic underline decoration-primary/30 underline-offset-4"
                          onClick={async () => {
                            const ok = await confirm({ 
                              title: 'REABRIR PERÍODO', 
                              description: 'ESTA AÇÃO PERMITIRÁ ALTERAÇÕES RETROATIVAS. CONFIRMAR DESBLOQUEIO?' 
                            });
                            if (ok) api.financeiro.fechamentos.save({ ...f, status: 'aberto' }).then(fetchFechamentos);
                          }}
                        >
                          REABRIR CICLO
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FinanceiroContasPage;
