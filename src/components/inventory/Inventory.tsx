import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { Material } from '../../context/AppContext';
import MaterialCard from './components/MaterialCard';
import MovimentacaoModal from './components/MovimentacaoModal';
import MaterialFormModal from './components/MaterialFormModal';
import EstoqueAlertasBanner from './components/EstoqueAlertasBanner';
import { statusEstoque } from '../../utils/estoque';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  History, 
  LayoutGrid, 
  List,
  AlertTriangle 
} from 'lucide-react';

type MainTab = 'materials' | 'history';

const Inventory: React.FC = () => {
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
      const matchStatus = filterStatus ? statusEstoque(m.estoque_atual, m.estoque_minimo) === filterStatus : true;
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
        alert('Erro ao excluir material: ' + (err as Error).message);
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Package size={28} style={{ color: 'var(--primary)' }} /> Gestão de Estoque
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Controle de materiais, entradas/saídas e alertas de reposição.
          </p>
        </div>
        <button onClick={handleNew} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} /> Novo Material
        </button>
      </header>

      <EstoqueAlertasBanner onFilterCritico={() => setFilterStatus('critico')} />

      {/* Navegação e Filtros */}
      <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('materials')}
            className={`btn ${activeTab === 'materials' ? 'btn-primary' : ''}`}
            style={{ fontSize: '0.85rem', background: activeTab === 'materials' ? '' : 'transparent' }}
          >
            <LayoutGrid size={16} style={{ marginRight: '0.5rem' }} /> Inventário
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`btn ${activeTab === 'history' ? 'btn-primary' : ''}`}
            style={{ fontSize: '0.85rem', background: activeTab === 'history' ? '' : 'transparent' }}
          >
            <History size={16} style={{ marginRight: '0.5rem' }} /> Movimentações
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, justifyContent: 'flex-end', minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              className="input-base" 
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              placeholder="Buscar por SKU ou Nome..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="input-base" 
            style={{ width: '180px' }}
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">Todas Categorias</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select 
            className="input-base" 
            style={{ width: '160px' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Todos Status</option>
            <option value="ok">Estoque OK</option>
            <option value="alerta">Alerta</option>
            <option value="critico">Crítico</option>
            <option value="zerado">Zerado</option>
          </select>
        </div>
      </div>

      {activeTab === 'materials' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', background: 'var(--badge-bg)', padding: '0.25rem', borderRadius: '8px' }}>
              <button 
                onClick={() => setViewMode('grid')}
                style={{ all: 'unset', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', background: viewMode === 'grid' ? 'var(--primary-glow)' : 'transparent', color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)' }}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                style={{ all: 'unset', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', background: viewMode === 'table' ? 'var(--primary-glow)' : 'transparent', color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-muted)' }}
              >
                <List size={18} />
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid-4 animate-fade-in" style={{ gap: '1.25rem' }}>
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
            <div className="card animate-fade-in" style={{ padding: '0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--table-border)', background: 'var(--table-header-bg)' }}>
                    <th style={{ padding: '1rem' }}>SKU</th>
                    <th style={{ padding: '1rem' }}>Nome</th>
                    <th style={{ padding: '1rem' }}>Categoria</th>
                    <th style={{ padding: '1rem' }}>Estoque</th>
                    <th style={{ padding: '1rem' }}>Equivalente</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                    <th style={{ padding: '1rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map(m => {
                    if (!m || !m.id) return null;
                    const status = statusEstoque(m.estoque_atual, m.estoque_minimo);
                    const cat = categorias ? categorias.find(c => c.id === m.categoria_id) : undefined;
                    const equivalencia = Number(m.estoque_atual || 0) * Number(m.fator_conversao || 1);
                    
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{m.sku || '-'}</td>
                        <td style={{ padding: '1rem', fontWeight: '600' }}>{m.nome || 'Material sem nome'}</td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{cat?.nome || '-'}</td>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{m.estoque_atual || 0} {m.unidade_compra}</td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {equivalencia.toFixed(2)} {m.unidade_uso}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '10px', 
                            background: status === 'ok' ? 'rgba(16,185,129,0.1)' : status === 'critico' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                            color: status === 'ok' ? '#10b981' : status === 'critico' ? '#ef4444' : '#f59e0b',
                            fontWeight: 'bold'
                          }}>
                            {status ? status.toUpperCase() : '—'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <button onClick={() => handleEdit(m)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1rem', marginRight: '0.75rem' }} title="Editar">✎</button>
                          <button onClick={() => handleOpenMov(m)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', marginRight: '0.5rem' }}>Movimentar</button>
                          <button onClick={() => handleDelete(m)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem' }} title="Excluir">🗑</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredMaterials.length === 0 && (
            <div className="card" style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhum material encontrado com estes filtros.
            </div>
          )}
        </>
      ) : (
        <div className="card animate-fade-in" style={{ padding: '0' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
             <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Histórico de Movimentações</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--table-border)' }}>
                  <th style={{ padding: '1rem' }}>Data</th>
                  <th style={{ padding: '1rem' }}>Material</th>
                  <th style={{ padding: '1rem' }}>Tipo</th>
                  <th style={{ padding: '1rem' }}>Qtd</th>
                  <th style={{ padding: '1rem' }}>Motivo</th>
                  <th style={{ padding: '1rem' }}>Responsável</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.length > 0 ? (
                  movimentacoes.map(mov => (
                    <tr key={mov.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        {new Date(mov.criado_em).toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600' }}>{mov.material_nome}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{mov.material_sku}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          background: mov.tipo === 'entrada' ? 'rgba(16, 185, 129, 0.1)' : 
                                     mov.tipo === 'saida' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          color: mov.tipo === 'entrada' ? '#10b981' : 
                                 mov.tipo === 'saida' ? '#ef4444' : '#3b82f6'
                        }}>
                          {mov.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                        {mov.tipo === 'saida' ? '-' : '+'}{mov.quantidade} {mov.material_unidade}
                      </td>
                      <td style={{ padding: '1rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {mov.motivo}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        {mov.criado_por}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Nenhuma movimentação registrada no sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
    </div>
  );
};

export default Inventory;

