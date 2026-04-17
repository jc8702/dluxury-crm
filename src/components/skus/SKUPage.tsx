import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, Filter, Loader2, Save, Tag, DollarSign, Package } from 'lucide-react';
import { api } from '../../lib/api';
import Modal from '../ui/Modal';
import DataTable from '../ui/DataTable';

const SKUPage: React.FC = () => {
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [formData, setFormData] = useState({ 
    sku_code: '', 
    nome: '', 
    preco_base: 0, 
    unidade_medida: 'UN', 
    atributos: {} 
  });

  useEffect(() => {
    fetchSKUs();
  }, []);

  const fetchSKUs = async () => {
    try {
      setLoading(true);
      const data = await api.skus.list();
      setSkus(data);
    } catch (err) {
      console.error('Failed to fetch SKUs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.skus.create(formData);
      setIsModalOpen(false);
      setFormData({ sku_code: '', nome: '', preco_base: 0, unidade_medida: 'UN', atributos: {} });
      await fetchSKUs();
    } catch (err) {
      console.error('Failed to save SKU:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredSkus = skus.filter(s => {
    const term = searchTerm.toLowerCase();
    const matchSearch = s.nome.toLowerCase().includes(term) || s.sku.toLowerCase().includes(term);
    const matchCategory = filterCategory ? s.categoria_id === filterCategory : true;
    return matchSearch && matchCategory;
  });

  const extractedCategories = Array.from(new Set(skus.map(s => s.categoria_id))).filter(Boolean) as string[];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Layers size={32} style={{ color: 'var(--primary)' }} /> Catálogo de Peças / SKUs
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.25rem' }}>
             Gerenciamento atômico de insumos técnicos e acessórios.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
        >
          <Plus size={20} /> Novo SKU
        </button>
      </header>

      <div className="card" style={{ padding: '0.75rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              className="input-base" 
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              placeholder="Buscar por código SKU ou nome..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="input-base" 
            style={{ padding: '0.65rem 1rem', background: 'var(--elevated)', color: 'var(--text)' }}
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">Todas as Categorias</option>
            {extractedCategories.map(c => <option key={c} value={c}>Cód: {c}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        {loading ? (
          <div style={{ padding: '5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
            <Loader2 className="animate-spin" /> Sincronizando com o banco industrial...
          </div>
        ) : (
          <DataTable 
            headers={['Código SKU', 'Nome do Item', 'Unidade', 'Preço Base', 'Status']}
            data={filteredSkus}
            renderRow={(s) => (
              <>
                <td style={{ padding: '1rem' }}><span className="badge badge-primary">{s.sku}</span></td>
                <td style={{ padding: '1rem', fontWeight: '600' }}>{s.nome}</td>
                <td style={{ padding: '1rem' }}>{s.unidade_medida}</td>
                <td style={{ padding: '1rem' }}>R$ {Number(s.preco_base).toFixed(2)}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ color: s.ativo ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.ativo ? '#10b981' : 'var(--text-muted)' }} />
                    {s.ativo ? 'ATIVO' : 'INATIVO'}
                  </span>
                </td>
              </>
            )}
            emptyMessage="Nenhum SKU encontrado no catálogo."
          />
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Novo SKU">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label">Código SKU</label>
              <div style={{ position: 'relative' }}>
                <Tag size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  required
                  className="input-base w-full" 
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Ex: SKU-FER-001"
                  value={formData.sku_code}
                  onChange={e => setFormData({...formData, sku_code: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="label">Unidade de Medida</label>
              <select 
                className="input-base w-full"
                value={formData.unidade_medida}
                onChange={e => setFormData({...formData, unidade_medida: e.target.value})}
              >
                <option value="UN">Unidade (UN)</option>
                <option value="MT">Metro (MT)</option>
                <option value="M2">Metro Quadrado (M2)</option>
                <option value="KG">Quilo (KG)</option>
                <option value="CX">Caixa (CX)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Nome da Peça / SKU</label>
            <div style={{ position: 'relative' }}>
              <Package size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                required
                className="input-base w-full" 
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Ex: Dobradiça 35mm Click"
                value={formData.nome}
                onChange={e => setFormData({...formData, nome: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="label">Preço Base de Custo (R$)</label>
            <div style={{ position: 'relative' }}>
              <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                required
                type="number"
                step="0.01"
                className="input-base w-full" 
                style={{ paddingLeft: '2.5rem' }}
                placeholder="0.00"
                value={formData.preco_base}
                onChange={e => setFormData({...formData, preco_base: Number(e.target.value)})}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline flex-1">Cancelar</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={20} /> : <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Save size={20} /> Salvar SKU</div>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SKUPage;

