import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import type { Material } from '../../../context/AppContext';
import { X, Save } from 'lucide-react';

interface MaterialFormModalProps {
  material?: Material;
  onClose: () => void;
  onSuccess: () => void;
}

const MaterialFormModal: React.FC<MaterialFormModalProps> = ({ material, onClose, onSuccess }) => {
  const { categorias, addMaterial, updateMaterial } = useAppContext();
  const [form, setForm] = useState({
    sku: '', nome: '', descricao: '', categoria_id: '', subcategoria: '',
    unidade_compra: 'chapa', unidade_uso: 'm2', fator_conversao: 1,
    estoque_minimo: 0, preco_custo: 0, fornecedor_principal: '', observacoes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (material) {
      setForm({
        sku: material.sku, nome: material.nome, descricao: material.descricao || '',
        categoria_id: material.categoria_id, subcategoria: material.subcategoria || '',
        unidade_compra: material.unidade_compra, unidade_uso: material.unidade_uso,
        fator_conversao: material.fator_conversao, estoque_minimo: material.estoque_minimo,
        preco_custo: material.preco_custo, fornecedor_principal: material.fornecedor_principal || '',
        observacoes: material.observacoes || ''
      });
    }
  }, [material]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (material) {
        await updateMaterial(material.id, form);
      } else {
        await addMaterial(form);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar material.');
    } finally {
      setLoading(false);
    }
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '0.78rem', color: 'var(--primary)', marginBottom: '1rem',
    borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem',
    fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase'
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content animate-pop-in" style={{ maxWidth: '820px', width: '95%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text)' }}>
              {material ? 'Editar Material' : 'Novo Material'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Cadastre as especificações técnicas para controle MRP.
            </p>
          </div>
          <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.5rem' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="grid-2">
            {/* Identificação */}
            <div className="section">
              <h5 style={sectionTitleStyle}>Identificação</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="label-base">SKU / Código Único *</label>
                  <input className="input-base" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} required placeholder="Ex: MDF-15-BR" />
                </div>
                <div>
                  <label className="label-base">Nome Comercial *</label>
                  <input className="input-base" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required placeholder="Ex: Chapa MDF 15mm Branco" />
                </div>
                <div className="grid-2">
                  <div>
                    <label className="label-base">Categoria *</label>
                    <select className="input-base" value={form.categoria_id} onChange={e => setForm({...form, categoria_id: e.target.value})} required>
                      <option value="">Selecione...</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-base">Subcategoria</label>
                    <input className="input-base" value={form.subcategoria} onChange={e => setForm({...form, subcategoria: e.target.value})} placeholder="Ex: MDF, Ferragem..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Conversão e Logística */}
            <div className="section">
              <h5 style={sectionTitleStyle}>Conversão e Logística</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-2">
                  <div>
                    <label className="label-base">Unidade Compra</label>
                    <select className="input-base" value={form.unidade_compra} onChange={e => setForm({...form, unidade_compra: e.target.value})}>
                      <option value="chapa">Chapa</option>
                      <option value="rolo 50m">Rolo 50m</option>
                      <option value="caixa c/200un">Caixa c/200un</option>
                      <option value="caixa c/100un">Caixa c/100un</option>
                      <option value="caixa c/500un">Caixa c/500un</option>
                      <option value="caixa c/20un">Caixa c/20un</option>
                      <option value="barra">Barra</option>
                      <option value="un">Unidade</option>
                      <option value="par">Par</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-base">Unidade Uso</label>
                    <select className="input-base" value={form.unidade_uso} onChange={e => setForm({...form, unidade_uso: e.target.value})}>
                      <option value="un">Unidade</option>
                      <option value="m">Metro (m)</option>
                      <option value="m2">Metro² (m²)</option>
                      <option value="kg">Quilo (kg)</option>
                      <option value="par">Par</option>
                      <option value="barra">Barra</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label-base">Fator de Conversão (Compra → Uso)</label>
                  <input type="number" step="0.0001" className="input-base" value={form.fator_conversao} onChange={e => setForm({...form, fator_conversao: Number(e.target.value)})} />
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Ex: 1 chapa = 5.0325 m². 1 rolo = 50m.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Parâmetros Financeiros */}
          <div className="section">
            <h5 style={sectionTitleStyle}>Parâmetros Financeiros e Estoque</h5>
            <div className="grid-3">
              <div>
                <label className="label-base">Preço Custo (R$)</label>
                <input type="number" step="0.01" className="input-base" value={form.preco_custo} onChange={e => setForm({...form, preco_custo: Number(e.target.value)})} />
              </div>
              <div>
                <label className="label-base">Estoque Mínimo</label>
                <input type="number" step="0.01" className="input-base" value={form.estoque_minimo} onChange={e => setForm({...form, estoque_minimo: Number(e.target.value)})} />
              </div>
              <div>
                <label className="label-base">Fornecedor Principal</label>
                <input className="input-base" value={form.fornecedor_principal} onChange={e => setForm({...form, fornecedor_principal: e.target.value})} placeholder="Ex: Arauco" />
              </div>
            </div>
          </div>

          <div>
            <label className="label-base">Observações Internas</label>
            <textarea className="input-base" style={{ height: '80px', resize: 'none' }} value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} />
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ minWidth: '120px' }}>Cancelar</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ minWidth: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Save size={16} /> {loading ? 'Salvando...' : 'Salvar Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialFormModal;
