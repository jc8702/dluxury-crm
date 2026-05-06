import { useEffect, useState, useMemo } from 'react';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../context/ToastContext';
import { Modal } from '../design-system/components/Modal';
import { TableSkeleton } from '../design-system/components/Skeleton';
import { api } from '../lib/api';
import { Download, Filter, RefreshCw, Plus, Edit2, FileText, Search, X, Repeat, AlertCircle, Trash2, Lock } from 'lucide-react';

const FinanceiroContasPage = () => {
  const [ConfirmDialogElement, confirm] = useConfirm();
  const { success, error, warning } = useToast();
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', tipo: 'conta_corrente', banco_codigo: '', agencia: '', conta: '', saldo_inicial: 0 });
  
  // Extrato state
  const [extrato, setExtrato] = useState<any>(null);
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
  const [transferForm, setTransferForm] = useState({
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
  const [fechamentos, setFechamentos] = useState<any[]>([]);
  const [fechamentoForm, setFechamentoForm] = useState({ 
    mes: new Date().getMonth() + 1, 
    ano: new Date().getFullYear(), 
    status: 'fechado', 
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
  
  const openEdit = (c: any) => { 
    setEditing(c); 
    setForm({ nome: c.nome, tipo: c.tipo, banco_codigo: c.banco_codigo, agencia: c.agencia, conta: c.conta, saldo_inicial: c.saldo_inicial }); 
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
      title: 'Excluir Conta',
      description: `TEM CERTEZA QUE DESEJA EXCLUIR A CONTA "${nome.toUpperCase()}"?\nESTA AÇÃO NÃO PODE SER DESFEITA.`
    });
    if (!isConfirmed) return;
    try {
      await api.financeiro.contasInternas.delete(id);
      fetchContas();
      success('Conta excluída com sucesso!');
    } catch (e: any) { error(e.message || 'Erro ao excluir'); }
  };

  const openExtrato = async (conta: any) => {
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
      // A API retorna { success: true, data: { conta, saldo_inicial, extrato: [] } }
      const payload = json.data ?? json;
      setExtrato(payload);
    } catch (e) { 
      console.error('Erro ao carregar extrato:', e); 
      setExtrato(null);
    }
    setExtratoLoading(false);
  };
  // Filtrar extrato
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

  // Totais filtrados
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


  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Contas Internas
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>Caixas, contas bancárias e extratos</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={fetchContas} style={{ height: '48px' }}>
            <RefreshCw /> ATUALIZAR
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => { setTransferErro(''); setShowTransferencia(true); }}
            style={{ height: '48px', color: 'hsl(var(--info))', borderColor: 'hsl(var(--info))' }}
            disabled={contas.length < 2}
          >
            <Repeat /> TRANSFERIR
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => setShowFechamento(true)}
            style={{ height: '48px', color: 'hsl(var(--warning))', borderColor: 'hsl(var(--warning))' }}
          >
            <Lock /> FECHAMENTOS
          </button>
          <button className="btn btn-primary" onClick={openNew} style={{ height: '48px', padding: '0 1.5rem' }}>
            <Plus /> NOVA CONTA
          </button>
        </div>
      </div>

      {/* Cards de Contas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {loading ? (
          <div className="card glass" style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
            <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '3px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : contas.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1', color: 'hsl(var(--muted-foreground))' }}>
            Nenhuma conta cadastrada.
          </div>
        ) : contas.map(c => (
          <div key={c.id} className="card glass hover-scale animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    {c.tipo?.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{c.nome}</div>
                  {c.banco_codigo && (
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
                      BCO {c.banco_codigo} • AG {c.agencia} • CC {c.conta}
                    </div>
                  )}
                </div>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', 
                  background: 'var(--icon-bg)', color: 'var(--icon-color)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '1rem', fontWeight: 800 
                }}>
                  {(c.nome || 'C').charAt(0)}
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: Number(c.saldo_atual) >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                R$ {Number(c.saldo_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>Saldo Atual</div>
            </div>
            <div style={{ display: 'flex', borderTop: '1px solid hsl(var(--border))' }}>
              <button 
                className="btn" 
                onClick={() => openEdit(c)} 
                style={{ flex: 1, borderRadius: 0, padding: '0.85rem', fontSize: '0.8rem', borderRight: '1px solid hsl(var(--border))' }}
              >
                <Edit2 style={{ fontSize: '0.85rem' }} /> EDITAR
              </button>
              <button 
                className="btn" 
                onClick={() => openExtrato(c)} 
                style={{ flex: 1, borderRadius: 0, padding: '0.85rem', fontSize: '0.8rem', color: 'hsl(var(--primary))', borderRight: '1px solid hsl(var(--border))' }}
              >
                <FileText style={{ fontSize: '0.85rem' }} /> EXTRATO
              </button>
              <button 
                className="btn" 
                onClick={() => doDelete(c.id, c.nome)} 
                style={{ width: '50px', borderRadius: 0, padding: '0.85rem', fontSize: '0.8rem', color: 'hsl(var(--destructive))' }}
                title="EXCLUIR CONTA"
                aria-label={`Excluir conta ${c.nome}`}
              >
                <Trash2 />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova/Editar Conta */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? 'Editar Conta' : 'Nova Conta'} width="550px">
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div>
            <label className="label-base">Nome da Conta</label>
            <input className="input-base" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Itaú Conta Corrente" />
          </div>
          <div className="grid-2">
            <div>
              <label className="label-base">Tipo</label>
              <select className="input-base" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                <option value="conta_corrente">Conta Corrente</option>
                <option value="poupanca">Poupança</option>
                <option value="caixa">Caixa</option>
                <option value="aplicacao">Aplicação</option>
              </select>
            </div>
            <div>
              <label className="label-base">Código do Banco</label>
              <input className="input-base" value={form.banco_codigo} onChange={e => setForm({...form, banco_codigo: e.target.value})} placeholder="Ex: 341" />
            </div>
          </div>
          <div className="grid-2">
            <div>
              <label className="label-base">Agência</label>
              <input className="input-base" placeholder="0001" value={form.agencia} onChange={e => setForm({...form, agencia: e.target.value})} />
            </div>
            <div>
              <label className="label-base">Conta</label>
              <input className="input-base" placeholder="12345-6" value={form.conta} onChange={e => setForm({...form, conta: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="label-base">Saldo Inicial (R$)</label>
            <input type="number" className="input-base" value={form.saldo_inicial} onChange={e => setForm({...form, saldo_inicial: Number(e.target.value)})} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-outline" onClick={() => setIsOpen(false)}>CANCELAR</button>
            <button className="btn btn-primary" onClick={save}>SALVAR</button>
          </div>
        </div>
      </Modal>

      {/* Modal Transferência entre Contas */}
      <Modal isOpen={showTransferencia} onClose={() => setShowTransferencia(false)} title="Transferência entre Contas" width="520px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ 
            padding: '0.75rem 1rem', background: 'rgba(59,130,246,0.08)', 
            borderRadius: 'var(--radius-sm)', borderLeft: '4px solid hsl(var(--info))',
            fontSize: '0.82rem', color: 'hsl(var(--muted-foreground))'
          }}>
            <strong>Como funciona:</strong> O valor é debitado da conta de origem e creditado na conta de destino. A operação é registrada no extrato de ambas as contas.
          </div>

          <div>
            <label className="label-base">Conta de Origem</label>
            <select 
              className="input-base" 
              value={transferForm.conta_origem_id}
              onChange={e => setTransferForm({...transferForm, conta_origem_id: e.target.value})}
            >
              <option value="">Selecione a conta de origem...</option>
              {contas.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome} — R$ {Number(c.saldo_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-base">Conta de Destino</label>
            <select 
              className="input-base" 
              value={transferForm.conta_destino_id}
              onChange={e => setTransferForm({...transferForm, conta_destino_id: e.target.value})}
            >
              <option value="">Selecione a conta de destino...</option>
              {contas.filter(c => c.id !== transferForm.conta_origem_id).map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome} — R$ {Number(c.saldo_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2">
            <div>
              <label className="label-base">Valor (R$)</label>
              <input 
                type="number" min="0.01" step="0.01"
                className="input-base" 
                placeholder="0,00"
                value={transferForm.valor}
                onChange={e => setTransferForm({...transferForm, valor: e.target.value})}
              />
            </div>
            <div>
              <label className="label-base">Data</label>
              <input 
                type="date" 
                className="input-base" 
                value={transferForm.data_movimento}
                onChange={e => setTransferForm({...transferForm, data_movimento: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="label-base">Descrição / Histórico</label>
            <input 
              className="input-base" 
              placeholder="Ex: Aplicação financeira, reserva de caixa..."
              value={transferForm.descricao}
              onChange={e => setTransferForm({...transferForm, descricao: e.target.value})}
            />
          </div>

          {transferErro && (
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem', background: 'rgba(239,68,68,0.1)', 
              borderRadius: 'var(--radius-sm)', color: 'hsl(var(--destructive))', fontSize: '0.85rem'
            }}>
              <AlertCircle /> {transferErro}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <button className="btn btn-outline" onClick={() => setShowTransferencia(false)}>CANCELAR</button>
            <button 
              className="btn btn-primary" 
              onClick={doTransferencia}
              disabled={transferLoading}
              style={{ minWidth: '140px' }}
            >
              {transferLoading ? 'TRANSFERINDO...' : <><Repeat /> CONFIRMAR</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Extrato Completo */}
      <Modal isOpen={showExtrato} onClose={() => setShowExtrato(false)} title={`Extrato — ${extratoContaNome}`} width="1100px">
        {extratoLoading ? (
          <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ marginTop: '1rem', color: 'hsl(var(--muted-foreground))' }}><TableSkeleton rows={8} cols={4} /></div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Resumo Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid hsl(var(--info))' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em' }}>Saldo Anterior</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem' }}>
                  R$ {Number(extrato?.saldo_inicial || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.2rem' }}>Antes do 1º lançamento</div>
              </div>
              <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid hsl(var(--success))' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em' }}>Total Entradas</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem', color: 'hsl(var(--success))' }}>
                  + R$ {extratoTotais.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid hsl(var(--destructive))' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em' }}>Total Saídas</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem', color: 'hsl(var(--destructive))' }}>
                  - R$ {extratoTotais.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid hsl(var(--primary))' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em' }}>Saldo Atual</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem', color: 'hsl(var(--primary))' }}>
                  R$ {Number(extrato?.conta?.saldo_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Barra de Filtros */}
            <div style={{ 
              display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end',
              padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)',
              border: '1px solid hsl(var(--border))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem' }}>
                <Filter /> FILTROS:
              </div>
              <div style={{ flex: '0 0 auto' }}>
                <label className="label-base" style={{ fontSize: '0.65rem' }}>De</label>
                <input 
                  type="date" className="input-base" 
                  value={filtroDataInicio} 
                  onChange={e => setFiltroDataInicio(e.target.value)}
                  style={{ width: '150px', padding: '0.45rem 0.6rem', fontSize: '0.8rem' }}
                />
              </div>
              <div style={{ flex: '0 0 auto' }}>
                <label className="label-base" style={{ fontSize: '0.65rem' }}>Até</label>
                <input 
                  type="date" className="input-base" 
                  value={filtroDataFim} 
                  onChange={e => setFiltroDataFim(e.target.value)}
                  style={{ width: '150px', padding: '0.45rem 0.6rem', fontSize: '0.8rem' }}
                />
              </div>
              <div style={{ flex: '0 0 auto' }}>
                <label className="label-base" style={{ fontSize: '0.65rem' }}>Tipo</label>
                <select 
                  className="input-base" 
                  value={filtroTipo} 
                  onChange={e => setFiltroTipo(e.target.value as any)}
                  style={{ width: '140px', padding: '0.45rem 0.6rem', fontSize: '0.8rem' }}
                >
                  <option value="todos">Todos</option>
                  <option value="entrada">Entradas</option>
                  <option value="saida">Saídas</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '160px' }}>
                <label className="label-base" style={{ fontSize: '0.65rem' }}>Buscar</label>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem' }} />
                  <input 
                    type="text" className="input-base" 
                    placeholder="Buscar descrição..." 
                    value={filtroBusca}
                    onChange={e => setFiltroBusca(e.target.value)}
                    style={{ paddingLeft: '2rem', padding: '0.45rem 0.6rem 0.45rem 2rem', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(filtroDataInicio || filtroDataFim || filtroTipo !== 'todos' || filtroBusca) && (
                  <button 
                    className="btn btn-outline" 
                    onClick={() => { setFiltroDataInicio(''); setFiltroDataFim(''); setFiltroTipo('todos'); setFiltroBusca(''); }}
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    <X /> LIMPAR
                  </button>
                )}
                <button 
                  className="btn btn-outline" 
                  onClick={exportCSV}
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}
                >
                  <Download /> CSV
                </button>
              </div>
            </div>

            {/* Info Filtro */}
            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
              {extratoTotais.qtd} movimentação(ões) encontrada(s)
              {(filtroDataInicio || filtroDataFim || filtroTipo !== 'todos' || filtroBusca) && ' com filtros aplicados'}
            </div>

            {/* Tabela do Extrato */}
            <div style={{ maxHeight: '50vh', overflowY: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border))' }}>
              <table>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
                  <tr>
                    <th style={{ width: '100px' }}>Data</th>
                    <th>Descrição</th>
                    <th style={{ width: '90px' }}>Tipo</th>
                    <th style={{ width: '80px' }}>Origem</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>Valor</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>Saldo</th>
                    <th style={{ textAlign: 'center', width: '60px' }}>✔</th>
                  </tr>
                </thead>
                <tbody>
                  {extratoFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <div className="empty-state" style={{ border: 'none', borderRadius: 0 }}>
                          Nenhuma movimentação encontrada.
                        </div>
                      </td>
                    </tr>
                  ) : extratoFiltrado.map((m: any, idx: number) => {
                    const isPositive = Number(m.valor) > 0;
                    return (
                      <tr key={m.id || idx} style={{ opacity: m.conferido ? 0.7 : 1 }}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {new Date(m.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{m.descricao || (m.tipo === 'recebimento' ? 'Recebimento de Título' : m.tipo === 'pagamento' ? 'Pagamento de Título' : m.tipo)}</div>
                        </td>
                        <td>
                          <span className="badge" style={{ 
                            background: isPositive ? 'rgba(34,197,94,0.15)' : 'hsl(var(--destructive)/0.15)', 
                            color: isPositive ? '#22c55e' : 'hsl(var(--destructive))',
                            fontSize: '0.65rem'
                          }}>
                            {isPositive ? 'ENTRADA' : 'SAÍDA'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>
                          {m.origem}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: isPositive ? '#22c55e' : 'hsl(var(--destructive))' }}>
                          {isPositive ? '+' : ''} R$ {Math.abs(Number(m.valor)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                          R$ {Number(m.saldo_momento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                           <input 
                             type="checkbox" 
                             checked={!!m.conferido}
                             onChange={async () => {
                               try {
                                 await api.financeiro.conferencia.toggle({
                                   id: m.id,
                                   origem: m.origem,
                                   conferido: !m.conferido
                                 });
                                 // Refresh local
                                 const newExtrato = { ...extrato };
                                 const item = newExtrato.extrato.find((item: any) => item.id === m.id);
                                 if (item) item.conferido = !m.conferido;
                                 setExtrato(newExtrato);
                                 success(m.conferido ? 'Conferência removida' : 'Lançamento conferido');
                               } catch (err) {
                                 error('Erro ao atualizar conferência');
                               }
                             }}
                             style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'hsl(var(--success))' }}
                           />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => window.print()} style={{ fontSize: '0.8rem' }}>
                IMPRIMIR
              </button>
              <button className="btn btn-primary" onClick={() => setShowExtrato(false)}>
                FECHAR EXTRATO
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Fechamentos */}
      <Modal isOpen={showFechamento} onClose={() => setShowFechamento(false)} title="Gestão de Fechamentos Financeiros" width="600px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', borderLeft: '4px solid hsl(var(--warning))' }}>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
              <strong>Atenção:</strong> Ao fechar um período, lançamentos e baixas com data de vencimento/movimento naquele mês serão <strong>bloqueados</strong>. 
              Isso garante que o saldo final do mês não seja alterado após a conferência.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'flex-end', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
             <div>
               <label className="label-base">Mês</label>
               <select className="input-base" value={fechamentoForm.mes} onChange={e => setFechamentoForm({...fechamentoForm, mes: Number(e.target.value)})}>
                 {Array.from({length: 12}).map((_, i) => <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('pt-BR', {month: 'long'})}</option>)}
               </select>
             </div>
             <div>
               <label className="label-base">Ano</label>
               <select className="input-base" value={fechamentoForm.ano} onChange={e => setFechamentoForm({...fechamentoForm, ano: Number(e.target.value)})}>
                 {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
               </select>
             </div>
             <button className="btn btn-primary" onClick={saveFechamento}>FECHAR MÊS</button>
          </div>

          <div>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Histórico de Fechamentos</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Competência</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {fechamentos.map(f => (
                    <tr key={f.id}>
                      {(() => {
                        const status = String(f.status || '').toLowerCase();
                        return (
                          <>
                            <td style={{ fontWeight: 600 }}>{new Date(2000, f.mes-1).toLocaleString('pt-BR', {month: 'long'})} / {f.ano}</td>
                            <td>
                              <span className="badge" style={{ background: status === 'fechado' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: status === 'fechado' ? 'hsl(var(--destructive))' : '#22c55e' }}>
                                {String(f.status || '').toUpperCase()}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem' }}>{new Date(f.data_fechamento).toLocaleDateString('pt-BR')}</td>
                            <td>
                              <button className="btn btn-ghost" style={{ padding: '4px 8px', color: '#22c55e' }} onClick={async () => {
                                const ok = await confirm({
                                  title: 'Reabrir Período',
                                  description: 'Deseja realmente reabrir este período?',
                                  variant: 'warning',
                                  confirmLabel: 'Reabrir'
                                });
                                if (ok) {
                                   api.financeiro.fechamentos.save({ ...f, status: 'aberto' }).then(fetchFechamentos);
                                }
                              }}>Reabrir</button>
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <ConfirmDialogElement />
    </div>
  );
};

export default FinanceiroContasPage;
