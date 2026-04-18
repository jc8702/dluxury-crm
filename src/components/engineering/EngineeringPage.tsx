import React, { useState, useEffect } from 'react';
import { Settings2, Plus, Zap, Box, Ruler, Loader2, Save } from 'lucide-react';
import { api } from '../../lib/api';
import Modal from '../ui/Modal';
import DataTable from '../ui/DataTable';

const EngineeringPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({ 
    id: null, nome: '', codigo_modelo: '', descricao: '',
    largura_padrao: 0, altura_padrao: 0, profundidade_padrao: 0,
    horas_mo_padrao: 0, valor_hora_padrao: 150, preco_material_m3_padrao: 0
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.engineering.list();
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (formData.id) {
        // Agora usamos o endpoint de PATCH para edições explícitas
        await api.engineering.update?.(formData.id, formData);
      } else {
        await api.engineering.create(formData);
      }
      
      setIsModalOpen(false);
      resetForm();
      await fetchProducts();
    } catch (err: any) {
      console.error('Failed to save product:', err);
      alert(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      id: null, nome: '', codigo_modelo: '', descricao: '',
      largura_padrao: 0, altura_padrao: 0, profundidade_padrao: 0,
      horas_mo_padrao: 0, valor_hora_padrao: 150, preco_material_m3_padrao: 0
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Settings2 size={32} style={{ color: 'var(--primary)' }} /> Engenharia de Produto
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.25rem' }}>
             Definição de módulos paramétricos e regras de cálculo (BOM).
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
        >
          <Plus size={20} /> Novo Módulo
        </button>
      </header>

      <div className="card" style={{ padding: '0' }}>
        {loading ? (
          <div style={{ padding: '5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
            <Loader2 className="animate-spin" /> Carregando engenharia...
          </div>
        ) : (
          <DataTable 
            headers={['Nome', 'Modelo', 'Descrição', 'Criado em', 'Ações']}
            data={products}
            renderRow={(p) => (
              <>
                <td style={{ padding: '1rem', fontWeight: '600' }}>{p.nome}</td>
                <td style={{ padding: '1rem' }}><span className="badge badge-outline">{p.codigo_modelo}</span></td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{p.descricao}</td>
                <td style={{ padding: '1rem', fontSize: '0.75rem' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '1rem' }}>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => { setFormData(p); setIsModalOpen(true); }} className="btn btn-outline btn-sm">Editar</button>
                   </div>
                </td>
              </>
            )}
            emptyMessage="Nenhum módulo de engenharia cadastrado."
          />
        )}
      </div>

      <section className="card" style={{ padding: '1.5rem', background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
             <Zap size={20} style={{ color: 'var(--primary)' }} />
             <h3 style={{ margin: 0, color: 'var(--primary)' }}>Motor de Cálculo (BOM Engine)</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            O motor de cálculo industrial está ativo. Ele processa automaticamente o consumo de materiais com base nos parâmetros definidos nestes módulos.
          </p>
      </section>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={formData.id ? "Editar Módulo de Engenharia" : "Cadastrar Novo Módulo de Engenharia"}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label">Nome do Módulo</label>
              <input required className="input-base w-full" placeholder="Ex: Armário Superior" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
            </div>
            <div>
              <label className="label">Código do Modelo</label>
              <input required className="input-base w-full" placeholder="Ex: MOD-ARMS-01" value={formData.codigo_modelo} onChange={e => setFormData({...formData, codigo_modelo: e.target.value})} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
             <div>
                <label className="label">Largura (cm)</label>
                <input type="number" className="input-base w-full" value={formData.largura_padrao} onChange={e => setFormData({...formData, largura_padrao: Number(e.target.value)})} />
             </div>
             <div>
                <label className="label">Altura (cm)</label>
                <input type="number" className="input-base w-full" value={formData.altura_padrao} onChange={e => setFormData({...formData, altura_padrao: Number(e.target.value)})} />
             </div>
             <div>
                <label className="label">Profundidade (cm)</label>
                <input type="number" className="input-base w-full" value={formData.profundidade_padrao} onChange={e => setFormData({...formData, profundidade_padrao: Number(e.target.value)})} />
             </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
             <div>
                <label className="label">Horas MO</label>
                <input type="number" className="input-base w-full" value={formData.horas_mo_padrao} onChange={e => setFormData({...formData, horas_mo_padrao: Number(e.target.value)})} />
             </div>
             <div>
                <label className="label">Valor/Hora (R$)</label>
                <input type="number" className="input-base w-full" value={formData.valor_hora_padrao} onChange={e => setFormData({...formData, valor_hora_padrao: Number(e.target.value)})} />
             </div>
             <div>
                <label className="label">Mat/m³ (R$)</label>
                <input type="number" className="input-base w-full" value={formData.preco_material_m3_padrao} onChange={e => setFormData({...formData, preco_material_m3_padrao: Number(e.target.value)})} />
             </div>
          </div>

          <div>
            <label className="label">Descrição Técnica</label>
            <textarea className="input-base w-full" style={{ minHeight: '80px' }} placeholder="Detalhes de construção..." value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline flex-1">Cancelar</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={20} /> : <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Save size={20} /> Salvar Módulo</div>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EngineeringPage;

