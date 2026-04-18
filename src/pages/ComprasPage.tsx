import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, ShoppingCart, 
  Trash2, Eye, CheckCircle2, AlertCircle, 
  History, TrendingUp, Package, ChevronRight,
  Printer, ArrowRight
} from 'lucide-react';
import { api } from '../lib/api';
import { PedidoCompra, Material } from '../api-lib/types';

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
          <div style={{ textAlign: 'center', padding: '4rem' }}>Carregando...</div>
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
            <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Estoque saudável. Nenhuma sugestão de compra pendente.
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

  useEffect(() => {
    api.estoque.fornecedores.list().then(setFornecedores);
    api.estoque.list().then(setMateriais);
    if (pedido?.id) {
        api.compras.getPedido(pedido.id).then(res => setFormData(res));
    }
  }, [pedido]);

  const handleSave = async () => {
    try {
      if (pedido?.id) {
        await api.compras.updatePedido(pedido.id, formData);
      } else {
        await api.compras.createPedido(formData);
      }
      onSave();
    } catch (error) {
      alert('Erro ao salvar pedido');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <ShoppingCart className="text-primary" /> 
            {pedido ? `Pedido ${pedido.numero}` : 'Novo Pedido de Compra'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <ArrowRight size={24} />
          </button>
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
          <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Itens do Pedido</h3>
          <div className="card" style={{ padding: 0 }}>
             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>SKU / Material</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem' }}>Qtd</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>Unitário</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.itens?.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Adicione itens ao pedido</td></tr>
                  ) : (
                    formData.itens?.map((itm: any, idx: number) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>{itm.descricao}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{itm.quantidade_pedida}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>R$ {Number(itm.preco_unitario).toFixed(2)}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>R$ {Number(itm.subtotal).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
             </table>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>Salvar Pedido</button>
        </div>
      </div>
    </div>
  );
};

export default ComprasPage;
