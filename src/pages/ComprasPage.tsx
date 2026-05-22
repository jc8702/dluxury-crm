import React, { useState, useEffect, useCallback } from 'react';
import SearchableSelect from '../components/ui/SearchableSelect';
import { 
  Plus, ShoppingCart, 
  Trash2, Eye, AlertCircle, 
  History
} from 'lucide-react';
import { api } from '../lib/api';

import { useToast } from '../context/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { CardSkeleton } from '../design-system/components/Skeleton';
import { Button, Card, CardContent, Input, Modal, Badge } from '../design-system/components';

const ComprasPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ativos' | 'historico' | 'sugestoes'>('ativos');
  const [showPedidoModal, setShowPedidoModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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
      case 'rascunho': return 'secondary';
      case 'enviado': return 'info';
      case 'confirmado': return 'success';
      case 'parcialmente_recebido': return 'warning';
      case 'recebido': return 'success';
      case 'cancelado': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex justify-between items-center pb-4 border-b border-border">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Gestão de Compras</h1>
          <p className="text-muted-foreground mt-1 text-sm">Fluxos de suprimentos, histórico de preços e reposição de estoque.</p>
        </div>
        <Button 
          variant="primary"
          onClick={() => { setSelectedPedido(null); setShowPedidoModal(true); }}
          className="flex items-center gap-2"
        >
          <Plus size={20} /> Novo Pedido
        </Button>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted/30 border border-border rounded-xl w-fit">
        <TabButton active={activeTab === 'ativos'} onClick={() => setActiveTab('ativos')} icon={<ShoppingCart size={18} />}>Pedidos Ativos</TabButton>
        <TabButton active={activeTab === 'sugestoes'} onClick={() => setActiveTab('sugestoes')} icon={<AlertCircle size={18} />}>Sugestões de Reposição</TabButton>
        <TabButton active={activeTab === 'historico'} onClick={() => setActiveTab('historico')} icon={<History size={18} />}>Histórico</TabButton>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="flex flex-col gap-4">
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
            getStatusLabel={getStatusLabel}
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
  <Button
    variant={active ? "primary" : "ghost"}
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm ${active ? '' : 'text-muted-foreground'}`}
  >
    {icon} {children}
  </Button>
);

const SugestoesGrid: React.FC<{ sugestoes: any[]; onAction: () => void }> = ({ sugestoes, onAction: _onAction }) => (
  <Card>
    <CardContent className="p-0 overflow-x-auto custom-scrollbar">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="text-left p-4 font-semibold text-muted-foreground">Material / SKU</th>
            <th className="text-center p-4 font-semibold text-muted-foreground">Estoque Atual</th>
            <th className="text-center p-4 font-semibold text-muted-foreground">Mínimo</th>
            <th className="text-right p-4 font-semibold text-muted-foreground">Preço Últ. Compra</th>
            <th className="text-center p-4 font-semibold text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sugestoes.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-0">
                <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mb-2 text-muted-foreground/60" />
                  <span>Estoque saudável. Nenhuma sugestão de compra pendente.</span>
                </div>
              </td>
            </tr>
          ) : (
            sugestoes.map(s => (
              <tr key={s.material_id} className="hover:bg-muted/10 transition-colors">
                <td className="p-4">
                  <div className="font-semibold text-foreground">{s.descricao}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">SKU: {s.sku}</div>
                </td>
                <td className="p-4 text-center">
                  <span className={`font-bold ${s.estoque_atual <= 0 ? 'text-destructive' : 'text-warning'}`}>
                    {s.estoque_atual} {s.unidade}
                  </span>
                </td>
                <td className="p-4 text-center text-muted-foreground">{s.estoque_minimo} {s.unidade}</td>
                <td className="p-4 text-right font-medium text-foreground">
                  R$ {s.preco_unitario?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-center">
                  <Button variant="secondary" className="px-3 py-1.5 text-xs">
                    Comprar agora
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </CardContent>
  </Card>
);

const PedidosTable: React.FC<{ pedidos: any[]; onView: (p: any) => void; getStatusColor: (s: string) => any; getStatusLabel: (s: string) => string }> = ({ pedidos, onView, getStatusColor, getStatusLabel }) => (
  <Card>
    <CardContent className="p-0 overflow-x-auto custom-scrollbar">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="text-left p-4 font-semibold text-muted-foreground">Nº Pedido</th>
            <th className="text-left p-4 font-semibold text-muted-foreground">Fornecedor</th>
            <th className="text-center p-4 font-semibold text-muted-foreground">Data</th>
            <th className="text-right p-4 font-semibold text-muted-foreground">Total</th>
            <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
            <th className="text-center p-4 font-semibold text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pedidos.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-12 text-center text-muted-foreground">
                Nenhum pedido de compra encontrado nesta categoria.
              </td>
            </tr>
          ) : (
            pedidos.map(p => (
              <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                <td className="p-4 font-bold text-primary">{p.numero}</td>
                <td className="p-4 text-foreground">{p.fornecedor_nome || 'Não definido'}</td>
                <td className="p-4 text-center text-muted-foreground">
                  {new Date(p.data_pedido || p.criado_em).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-4 text-right font-semibold text-foreground">
                  R$ {Number(p.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-center">
                  <Badge variant={getStatusColor(p.status)}>
                    {getStatusLabel(p.status)}
                  </Badge>
                </td>
                <td className="p-4 text-center">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onView(p)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye size={18} className="text-muted-foreground hover:text-foreground" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </CardContent>
  </Card>
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={pedido ? `Visualizar / Editar Pedido: ${pedido.numero}` : 'Novo Pedido de Compra'}
      size="xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">Fornecedor</label>
            <select 
              value={formData.fornecedor_id} 
              onChange={e => setFormData({ ...formData, fornecedor_id: e.target.value })}
              className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
            >
              <option value="">Selecione um fornecedor</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">Status</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
            >
              <option value="rascunho">Rascunho</option>
              <option value="enviado">Enviado</option>
              <option value="confirmado">Confirmado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Itens do Pedido */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-border">
             <h3 className="text-lg font-bold text-foreground">Itens do Pedido</h3>
             <div className="flex flex-wrap items-end gap-3">
                 <div className="flex flex-col gap-1.5">
                   <label className="text-xs font-semibold text-muted-foreground">Material</label>
                   <div className="w-[280px]">
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
                <div className="flex flex-col gap-1.5 w-16">
                  <label className="text-xs font-semibold text-muted-foreground">Qtd</label>
                  <Input 
                    type="number" 
                    value={newItem.quantidade}
                    onChange={e => setNewItem({ ...newItem, quantidade: Number(e.target.value) })}
                    className="p-2.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5 w-24">
                  <label className="text-xs font-semibold text-muted-foreground">V. Unit.</label>
                  <Input 
                    type="number" 
                    value={newItem.preco}
                    onChange={e => setNewItem({ ...newItem, preco: Number(e.target.value) })}
                    className="p-2.5 text-sm"
                  />
                </div>
                <Button 
                  variant="primary"
                  onClick={addItem}
                  disabled={!newItem.material_id}
                  className="flex items-center gap-1 py-2.5"
                >
                  <Plus size={16} /> Add
                </Button>
             </div>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto custom-scrollbar">
               <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left p-3 font-semibold text-muted-foreground">SKU / Material</th>
                      <th className="text-center p-3 font-semibold text-muted-foreground">Qtd</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Unitário</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Subtotal</th>
                      <th className="text-center p-3 font-semibold text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {formData.itens?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                          Adicione itens ao pedido
                        </td>
                      </tr>
                    ) : (
                      formData.itens?.map((itm: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/10 transition-colors">
                          <td className="p-3">
                              <div className="font-semibold text-foreground">{itm.descricao}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{itm.sku}</div>
                          </td>
                          <td className="p-3 text-center text-foreground">{itm.quantidade_pedida} {itm.unidade}</td>
                          <td className="p-3 text-right font-medium text-foreground">R$ {Number(itm.preco_unitario).toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-foreground">R$ {Number(itm.subtotal).toFixed(2)}</td>
                          <td className="p-3 text-center">
                              <Button 
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(idx)}
                                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              >
                                  <Trash2 size={16} />
                              </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {formData.itens?.length > 0 && (
                    <tfoot className="bg-muted/20 border-t border-border font-semibold">
                      <tr>
                          <td colSpan={3} className="text-right p-4 text-muted-foreground">TOTAL DO PEDIDO:</td>
                          <td className="text-right p-4 font-bold text-primary text-base">
                              R$ {Number(formData.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td></td>
                      </tr>
                    </tfoot>
                  )}
               </table>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-border">
          <div>
            {pedido?.id && (
              <Button variant="danger" onClick={handleDeletePedido}>
                Excluir Pedido
              </Button>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">Cancelar</Button>
            <Button variant="primary" onClick={handleSave} className="w-full sm:w-auto">Salvar Pedido</Button>
          </div>
        </div>
        {ConfirmDialogElement}
      </div>
    </Modal>
  );
};

export default ComprasPage;

