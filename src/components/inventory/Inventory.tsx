import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { Material } from '../../context/AppContext';
import MaterialCard from './components/MaterialCard';
import MovimentacaoModal from './components/MovimentacaoModal';
import MaterialFormModal from './components/MaterialFormModal';
import EstoqueAlertasBanner from './components/EstoqueAlertasBanner';
import { statusEstoque } from '../../utils/estoque';
import { useToast } from '../../context/ToastContext';
import { 
  Package, 
  Plus, 
  Search, 
  History, 
  LayoutGrid, 
  List
} from 'lucide-react';
import { Button, Card, CardContent, Input, Badge } from '../../design-system/components';

type MainTab = 'materials' | 'history';

const Inventory: React.FC = () => {
  const { error: toastError } = useToast();
  const { materiais, categorias, movimentacoes, removeMaterial, reloadData } = useAppContext();
  const [activeTab, setActiveTab] = useState<MainTab>('materials');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showMovModal, setShowMovModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editMaterial, setEditMaterial] = useState<Material | undefined>(undefined);

  const filteredMaterials = useMemo(() => {
    return materiais.filter(m => {
      const nome = m.nome || '';
      const sku = m.sku || '';
      const matchSearch = nome.toLowerCase().includes(search.toLowerCase()) || 
                          sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory ? m.categoria_id === filterCategory : true;
      const status = statusEstoque(m.estoque_atual, m.estoque_minimo);
      const matchStatus = filterStatus 
        ? filterStatus === 'critico_zerado'
          ? (status === 'critico' || status === 'zerado')
          : status === filterStatus
        : true;
      return matchSearch && matchCat && matchStatus;
    });
  }, [materiais, search, filterCategory, filterStatus]);

  const handleOpenMov = (m: Material) => {
    setSelectedMaterial(m);
    setShowMovModal(true);
  };

  const handleEdit = (m: Material) => {
    setEditMaterial(m);
    setShowFormModal(true);
  };

  const handleNew = () => {
    setEditMaterial(undefined);
    setShowFormModal(true);
  };

  const handleDelete = async (m: Material) => {
    if (confirm(`Tem certeza que deseja excluir "${m.nome}"?`)) {
      try {
        await removeMaterial(m.id);
        reloadData();
      } catch (err) {
        toastError('Erro ao excluir material', (err as Error).message);
      }
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ok': return 'success';
      case 'critico': return 'danger';
      case 'alerta': return 'warning';
      case 'zerado': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Package size={32} className="text-primary" /> Gestão de Estoque
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Controle de materiais, entradas/saídas e alertas de reposição.
          </p>
        </div>
        <Button onClick={handleNew} variant="primary" className="flex items-center gap-2">
          <Plus size={20} /> Novo Material
        </Button>
      </header>

      <EstoqueAlertasBanner onFilterCritico={() => setFilterStatus('critico_zerado')} />

      {/* Navegação e Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button 
              onClick={() => setActiveTab('materials')}
              variant={activeTab === 'materials' ? 'primary' : 'ghost'}
              className="text-sm font-semibold flex items-center gap-2"
            >
              <LayoutGrid size={16} /> Inventário
            </Button>
            <Button 
              onClick={() => setActiveTab('history')}
              variant={activeTab === 'history' ? 'primary' : 'ghost'}
              className="text-sm font-semibold flex items-center gap-2"
            >
              <History size={16} /> Movimentações
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 flex-1 justify-end max-w-3xl">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                className="pl-10 w-full" 
                placeholder="Buscar por SKU ou Nome..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground w-full sm:w-[180px]"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="">Todas Categorias</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select 
              className="bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground w-full sm:w-[160px]"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">Todos Status</option>
              <option value="ok">Estoque OK</option>
              <option value="alerta">Alerta</option>
              <option value="critico">Crítico</option>
              <option value="zerado">Zerado</option>
              <option value="critico_zerado">Atenção (Crítico/Zerado)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'materials' ? (
        <>
          <div className="flex justify-end mb-2">
            <div className="flex bg-muted/40 p-1 rounded-xl border border-border">
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className="p-2 h-8 w-8"
                aria-label="Visualização em Grade"
              >
                <LayoutGrid size={18} />
              </Button>
              <Button 
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                onClick={() => setViewMode('table')}
                className="p-2 h-8 w-8"
                aria-label="Visualização em Lista"
              >
                <List size={18} />
              </Button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
              {filteredMaterials.map(m => {
                if (!m || !m.id) return null;
                return (
                  <MaterialCard 
                    key={m.id} 
                    material={m} 
                    categoria={categorias ? categorias.find(c => c.id === m.categoria_id) : undefined}
                    onClick={() => handleOpenMov(m)}
                    onEdit={() => handleEdit(m)}
                    onDelete={() => handleDelete(m)}
                  />
                );
              })}
            </div>
          ) : (
            <Card className="animate-fade-in">
              <CardContent className="p-0 overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left p-4 font-semibold text-muted-foreground">SKU</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Nome</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Categoria</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Estoque</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Equivalente</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Status</th>
                      <th className="text-right p-4 font-semibold text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMaterials.map(m => {
                      if (!m || !m.id) return null;
                      const status = statusEstoque(m.estoque_atual, m.estoque_minimo);
                      const cat = categorias ? categorias.find(c => c.id === m.categoria_id) : undefined;
                      const equivalencia = Number(m.estoque_atual || 0) * Number(m.fator_conversao || 1);
                      
                      return (
                        <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-4 font-mono text-xs text-foreground">{m.sku || '-'}</td>
                          <td className="p-4 font-semibold text-foreground">{m.nome || 'Material sem nome'}</td>
                          <td className="p-4 text-muted-foreground">{cat?.nome || '-'}</td>
                          <td className="p-4 font-bold text-foreground">{m.estoque_atual || 0} {m.unidade_compra}</td>
                          <td className="p-4 text-muted-foreground">
                            {equivalencia.toFixed(2)} {m.unidade_uso}
                          </td>
                          <td className="p-4">
                            <Badge variant={getStatusBadgeVariant(status)}>
                              {status ? status.toUpperCase() : '—'}
                            </Badge>
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            <Button 
                              onClick={() => handleEdit(m)} 
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-primary"
                              title="Editar"
                              aria-label={`Editar material ${m.nome}`}
                            >✎</Button>
                            <Button 
                              onClick={() => handleOpenMov(m)} 
                              variant="primary" 
                              size="sm"
                              className="h-8 text-xs"
                              aria-label={`Registrar movimentação para ${m.nome}`}
                            >Movimentar</Button>
                            <Button 
                              onClick={() => handleDelete(m)} 
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-destructive hover:bg-destructive/10"
                              title="Excluir"
                              aria-label={`Excluir material ${m.nome}`}
                            >🗑</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {filteredMaterials.length === 0 && (
            <Card className="p-12 text-center text-muted-foreground col-span-full">
              Nenhum material encontrado com estes filtros.
            </Card>
          )}
        </>
      ) : (
        <Card className="animate-fade-in">
          <div className="p-4 border-b border-border">
             <h3 className="text-lg font-bold text-foreground">Histórico de Movimentações</h3>
          </div>
          <CardContent className="p-0 overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="p-4 font-semibold text-muted-foreground">Data</th>
                  <th className="p-4 font-semibold text-muted-foreground">Material</th>
                  <th className="p-4 font-semibold text-muted-foreground">Tipo</th>
                  <th className="p-4 font-semibold text-muted-foreground">Qtd</th>
                  <th className="p-4 font-semibold text-muted-foreground">Motivo</th>
                  <th className="p-4 font-semibold text-muted-foreground">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movimentacoes.length > 0 ? (
                  movimentacoes.map(mov => (
                    <tr key={mov.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 text-muted-foreground">
                        {new Date(mov.criado_em).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-foreground">{mov.material_nome}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">SKU: {mov.material_sku}</div>
                      </td>
                      <td className="p-4">
                        <Badge variant={mov.tipo === 'entrada' ? 'success' : mov.tipo === 'saida' ? 'danger' : 'info'}>
                          {mov.tipo.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-4 font-bold text-foreground">
                        {mov.tipo === 'saida' ? '-' : '+'}{mov.quantidade} {mov.material_unidade}
                      </td>
                      <td className="p-4 max-w-[250px] truncate text-foreground">
                        <div>{mov.motivo}</div>
                        {mov.nota_fiscal && (
                          <div className="text-xs text-primary font-medium mt-0.5">
                            NF: {mov.nota_fiscal}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {mov.criado_por}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                      Nenhuma movimentação registrada no sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Modais */}
      {showMovModal && selectedMaterial && (
        <MovimentacaoModal 
          material={selectedMaterial} 
          onClose={() => setShowMovModal(false)}
          onSuccess={reloadData}
        />
      )}

      {showFormModal && (
        <MaterialFormModal 
          material={editMaterial}
          onClose={() => setShowFormModal(false)}
          onSuccess={reloadData}
        />
      )}

      {/* 💡 Consultas de Estoque Inteligentes com Dlux */}
      <Card className="bg-gradient-to-br from-primary/5 via-violet-500/5 to-transparent border-primary/20 animate-fade-in">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <h3 className="text-lg font-bold text-foreground">Dlux Copilot — Consultas Rápidas de Estoque</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Consulte regras de estocagem de insumos e especificações técnicas de ferragens diretamente com a nossa inteligência.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '🚨 Estoque Crítico & Compras', query: 'Verificar materiais abaixo do estoque mínimo e plano de compras' },
              { label: '🪵 Estoque MDF & Consumo', query: 'Análise de estoque de chapas MDF e consumo recente' },
              { label: '📦 Corrediças Telescópicas vs Ocultas', query: 'Qual a diferença de folga lateral e rebaixo inferior exigida entre corrediça telescópica e invisível?' },
              { label: '🪵 MDF 15mm vs 18mm estrutural', query: 'Quando o projeto exige prateleiras de MDF 18mm para evitar envergamento e qual o vão máximo para 15mm?' },
              { label: '🔗 Dobradiça click com amortecimento', query: 'Como dimensionar o número de dobradiças tipo caneco de 35mm para portas de giro baseando-se no peso e altura?' },
              { label: '📐 Dispositivo Minifix e VB', query: 'Quais os diâmetros e profundidades de furação exigidos para instalação do sistema de união Minifix e VB?' },
              { label: '🛡️ Vedação e Chapas Ultra', query: 'Quais materiais e técnicas de vedação são obrigatórios para gabinetes de pia sob áreas úmidas no padrão D\'Luxury?' },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const event = new CustomEvent('dlux-open-chat', {
                    detail: { query: item.query }
                  });
                  window.dispatchEvent(event);
                }}
                className="bg-muted/40 hover:bg-primary/10 border border-border hover:border-primary text-foreground px-3 py-2 rounded-xl text-xs transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
              >
                <span>✨</span>
                {item.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventory;
