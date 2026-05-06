import React, { useState, useEffect, useCallback } from 'react';
import SearchableSelect from '../components/ui/SearchableSelect';
import { 
  Plus, Search, Filter, ShoppingCart, 
  Trash2, Eye, CheckCircle2, AlertCircle, 
  History, TrendingUp, Package, ChevronRight,
  Printer, ArrowRight
} from 'lucide-react';
import { api } from '../lib/api';
import type { PedidoCompra, Material } from '../api-lib/types';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { CardSkeleton } from '../design-system/components/Skeleton';

const ComprasPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ativos' | 'historico' | 'sugestoes'>('ativos');
  const [showPedidoModal, setShowPedidoModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sugestoes') {
        const data = await api.compras.getSugestoes();
        setSugestoes(data);
      } else {
        const data = await api.compras.listPedidos();
        setPedidos(data);
      }
    } catch (error) {
      console.error('Erro ao carregar compras:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rascunho': return '#6B7280';
      case 'enviado': return '#3B82F6';
      case 'confirmado': return '#8B5CF6';
      case 'parcialmente_recebido': return '#F59E0B';
      case 'recebido': return '#10B981';
      case 'cancelado': return '#EF4444';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: 'var(--primary)' }}>Gestão de Compras</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>Fluxos de suprimentos, histórico de preços e reposição de estoque.</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => { setSelectedPedido(null); setShowPedidoModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={20} /> Novo Pedido
        </button>
      </header>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        background: 'rgba(255,255,255,0.03)',
        padding: '0.5rem',
        borderRadius: 'var(--radius-lg)',
        width: 'fit-content'
      }}>
        <TabButton active={activeTab === 'ativos'} onClick={() => setActiveTab('ativos')} icon={<ShoppingCart size={18} />}>Pedidos Ativos</TabButton>
        <TabButton active={activeTab === 'sugestoes'} onClick={() => setActiveTab('sugestoes')} icon={<AlertCircle size={18} />}>Sugestões de Reposição</TabButton>
        <TabButton active={activeTab === 'historico'} onClick={() => setActiveTab('historico')} icon={<History size={18} />}>Histórico</TabButton>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : activeTab === 'sugestoes' ? (
          <SugestoesGrid sugestoes={sugestoes} onAction={() => fetchData()} />
        ) : (
          <PedidosTable 
            pedidos={pedidos.filter(p => activeTab === 'ativos' ? p.status !== 'recebido' && p.status !== 'cancelado' : p.status === 'recebido' || p.status === 'cancelado')} 
            onView={(p) => { setSelectedPedido(p); setShowPedidoModal(true); }}
            getStatusColor={getStatusColor}
          />
        )}
      </div>

      {showPedidoModal && (
        <PedidoModal 
          pedido={selectedPedido} 
          onClose={() => setShowPedidoModal(false)} 
          onSave={() => { fetchData(); setShowPedidoModal(false); }}
        />
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }> = ({ active, onClick, icon, children }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      padding: '0.6rem 1.2rem',
      borderRadius: 'var(--radius-md)',
      background: active ? 'var(--primary)' : 'transparent',
      color: active ? 'var(--sidebar-bg)' : 'var(--text-muted)',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.2s',
      fontSize: '0.85rem'
    }}
  >
    {icon} {children}
  </button>
);

const SugestoesGrid: React.FC<{ sugestoes: any[]; onAction: () => void }> = ({ sugestoes, onAction }) => (
  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
        <tr>
          <th style={{ textAlign: 'left', padding: '1rem' }}>Material / SKU</th>
          <th style={{ textAlign: 'center', padding: '1rem' }}>Estoque Atual</th>
          <th style={{ textAlign: 'center', padding: '1rem' }}>Mínimo</th>
          <th style={{ textAlign: 'right', padding: '1rem' }}>Preço Últ. Compra</th>
          <th style={{ textAlign: 'center', padding: '1rem' }}>Ações</th>
        </tr>
      </thead>
      <tbody>
        {sugestoes.length === 0 ? (
          <tr>
            <td colSpan={5} style={{ padding: 0 }}>
              <div className="empty-state" style={{ border: 'none', borderRadius: 0 }}>
                Estoque saudável. Nenhuma sugestão de compra pendente.
              </div>
            </td>
          </tr>
        ) : (
          sugestoes.map(s => (
            <tr key={s.material_id} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '1rem' }}>
                <div style={{ fontWeight: '600' }}>{s.descricao}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: {s.sku}</div>
              </td>
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <span style={{ color: s.estoque_atual <= 0 ? 'var(--error)' : 'var(--warning)', fontWeight: '700' }}>
                  {s.estoque_atual} {s.unidade}
                </span>
              </td>
              <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>{s.estoque_minimo} {s.unidade}</td>
              <td style={{ padding: '1rem', textAlign: 'right' }}>
                R$ {s.preco_unitario?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                  Comprar agora
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const PedidosTable: React.FC<{ pedidos: any[]; onView: (p: any) => void; getStatusColor: (s: string) => string }> = ({ pedidos, onView, getStatusColor }) => (
  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
        <tr>
          <th style={{ textAlign: 'left', padding: '1rem' }}>Nº Pedido</th>
          <th style={{ textAlign: 'left', padding: '1rem' }}>Fornecedor</th>
          <th style={{ textAlign: 'center', padding: '1rem' }}>Data</th>
          <th style={{ textAlign: 'right', padding: '1rem' }}>Total</th>
          <th style={{ textAlign: 'center', padding: '1rem' }}>Status</th>
          <th style={{ textAlign: 'center', padding: '1rem' }}>Ações</th>
        </tr>
      </thead>
      <tbody>
        {pedidos.map(p => (
          <tr key={p.id} style={{ borderTop: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row">
            <td style={{ padding: '1rem', fontWeight: '700', color: 'var(--primary)' }}>{p.numero}</td>
            <td style={{ padding: '1rem' }}>{p.fornecedor_nome || 'Não definido'}</td>
            <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {new Date(p.data_pedido || p.criado_em).toLocaleDateString('pt-BR')}
            </td>
            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
              R$ {Number(p.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </td>
            <td style={{ padding: '1rem', textAlign: 'center' }}>
              <span style={{ 
                padding: '0.3rem 0.7rem', 
                borderRadius: '12px', 
                fontSize: '0.7rem', 
                fontWeight: '700',
                background: `${getStatusColor(p.status)}20`,
                color: getStatusColor(p.status),
                textTransform: 'uppercase'
              }}>
                {p.status.replace('_', ' ')}
              </span>
            </td>
            <td style={{ padding: '1rem', textAlign: 'center' }}>
              <button 
                onClick={() => onView(p)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }}
              >
                <Eye size={18} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PedidoModal: React.FC<{ pedido: any; onClose: () => void; onSave: () => void }> = ({ pedido, onClose, onSave }) => {
  const { success, error: toastError } = useToast();
  const [ConfirmDialogElement, confirmAction] = useConfirm();
  const [formData, setFormData] = useState<any>(pedido || {
    fornecedor_id: '',
    status: 'rascunho',
    valor_total: 0,
    frete: 0,
    observacoes: '',
    itens: []
  });
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);

  const [newItem, setNewItem] = useState({
    material_id: '',
    quantidade: 1,
    preco: 0
  });

  useEffect(() => {
    api.estoque.fornecedores.list().then(setFornecedores);
    api.estoque.list().then(setMateriais);
    if (pedido?.id) {
        api.compras.getPedido(pedido.id).then(res => setFormData(res));
    }
  }, [pedido]);

  // Close modal on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const addItem = () => {
    const mat = materiais.find(m => m.id === newItem.material_id);
    if (!mat) return;

    const itemObj = {
      material_id: mat.id,
      sku: mat.sku,
      descricao: mat.nome,
      unidade: mat.unidade_compra || 'un',
      quantidade_pedida: Number(newItem.quantidade),
      preco_unitario: Number(newItem.preco || mat.preco_custo || 0),
      subtotal: Number(newItem.quantidade) * Number(newItem.preco || mat.preco_custo || 0)
    };

    const newItens = [...(formData.itens || []), itemObj];
    const newTotal = newItens.reduce((acc, i) => acc + i.subtotal, 0) + (Number(formData.frete) || 0);

    setFormData({ 
        ...formData, 
        itens: newItens,
        valor_total: newTotal
    });
    setNewItem({ material_id: '', quantidade: 1, preco: 0 });
  };

  const removeItem = (index: number) => {
    const newItens = formData.itens.filter((_: any, i: number) => i !== index);
    const newTotal = newItens.reduce((acc: number, i: any) => acc + i.subtotal, 0) + (Number(formData.frete) || 0);
    setFormData({ ...formData, itens: newItens, valor_total: newTotal });
  };

  const handleSave = async () => {
    try {
      if (pedido?.id) {
        await api.compras.updatePedido(pedido.id, formData);
      } else {
        await api.compras.createPedido(formData);
      }
      success('Pedido salvo com sucesso!');
      onSave();
    } catch (error: any) {
      toastError(error.message || 'Erro ao salvar pedido');
    }
  };

  const handleDeletePedido = useCallback(async () => {
    if (!pedido?.id) return toastError('Pedido não salvo ainda');
    const isConfirmed = await confirmAction({
      title: 'Excluir Pedido',
      description: 'Deseja excluir este Pedido de Compra?'
    });
    if (!isConfirmed) return;
    try {
      await fetch(`/api/compras?id=${encodeURIComponent(pedido.id)}&type=pedidos`, { method: 'DELETE' });
      success('Pedido excluído com sucesso!');
      onSave();
    } catch (e: any) {
      toastError('Erro ao excluir pedido: ' + e.message);
    }
  }, [pedido, onSave, confirmAction, toastError, success]);

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={(e) => { if ((e as any).key === 'Escape') onClose(); }} tabIndex={-1}>
      <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <ShoppingCart className="text-primary" /> 
            {pedido ? `Pedido ${pedido.numero}` : 'Novo Pedido de Compra'}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleDeletePedido} className="btn btn-danger">Excluir</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <ArrowRight size={24} />
            </button>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Fornecedor</label>
            <select 
              value={formData.fornecedor_id} 
              onChange={e => setFormData({ ...formData, fornecedor_id: e.target.value })}
            >
              <option value="">Selecione um fornecedor</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="rascunho">Rascunho</option>
              <option value="enviado">Enviado</option>
              <option value="confirmado">Confirmado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Itens do Pedido */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
             <h3 style={{ fontSize: '1rem', margin: 0 }}>Itens do Pedido</h3>
             <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                   <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Material</label>
                   <div style={{ width: 300 }}>
                     <SearchableSelect
                       items={materiais.map(m => ({ id: m.id, label: m.nome, sku: m.sku, _meta: m.fornecedor_principal }))}
                       value={newItem.material_id}
                       placeholder="Buscar por descrição ou SKU"
                       onChange={(id) => {
                         const m = materiais.find(mat => mat.id === id);
                         setNewItem({ ...newItem, material_id: id, preco: m?.preco_custo || 0 });
                       }}
                     />
                   </div>
                 </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Qtd</label>
                  <input 
                    type="number" 
                    style={{ padding: '0.3rem', fontSize: '0.8rem', width: '60px' }}
                    value={newItem.quantidade}
                    onChange={e => setNewItem({ ...newItem, quantidade: Number(e.target.value) })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>V. Unit.</label>
                  <input 
                    type="number" 
                    style={{ padding: '0.3rem', fontSize: '0.8rem', width: '90px' }}
                    value={newItem.preco}
                    onChange={e => setNewItem({ ...newItem, preco: Number(e.target.value) })}
                  />
                </div>
                <button 
                  className="btn-primary" 
                  style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={addItem}
                  disabled={!newItem.material_id}
                >
                  <Plus size={16} /> Add
                </button>
             </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>SKU / Material</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem' }}>Qtd</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>Unitário</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>Subtotal</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.itens?.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 0 }}><div className="empty-state" style={{ border: 'none', borderRadius: 0, padding: '2rem' }}>Adicione itens ao pedido</div></td></tr>
                  ) : (
                    formData.itens?.map((itm: any, idx: number) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: '600' }}>{itm.descricao}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{itm.sku}</div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{itm.quantidade_pedida} {itm.unidade}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>R$ {Number(itm.preco_unitario).toFixed(2)}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700' }}>R$ {Number(itm.subtotal).toFixed(2)}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <button 
                                onClick={() => removeItem(idx)}
                                style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', opacity: 0.7 }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {formData.itens?.length > 0 && (
                  <tfoot style={{ background: 'rgba(255,b255,b255,0.01)', borderTop: '2px solid var(--border)' }}>
                    <tr>
                        <td colSpan={3} style={{ textAlign: 'right', padding: '0.75rem', fontWeight: '600' }}>TOTAL DO PEDIDO:</td>
                        <td style={{ textAlign: 'right', padding: '0.75rem', fontWeight: '800', color: 'var(--primary)', fontSize: '1rem' }}>
                            R$ {Number(formData.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                    </tr>
                  </tfoot>
                )}
             </table>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>Salvar Pedido</button>
        </div>
        {ConfirmDialogElement}
      </div>
    </div>
  );
};

export default ComprasPage;
