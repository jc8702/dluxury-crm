import React, { useState, useEffect } from 'react';
import { Settings2, Plus, Zap, Box, Ruler, Loader2, Save, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import { CardSkeleton } from '../../design-system/components/Skeleton';
import { api } from '../../lib/api';
import { Modal } from '../../design-system/components/Modal';
import DataTable from '../ui/DataTable';
import SearchableSelect from '../ui/SearchableSelect';

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
      horas_mo_padrao: 0, valor_hora_padrao: 150, preco_material_m3_padrao: 0,
      regras_calculo: []
    });
  };

  const [skus, setSkus] = useState<any[]>([]);
  useEffect(() => {
    api.skus.list().then(setSkus).catch(console.error);
  }, []);

  const addComponent = () => {
    const newComponent = {
      id: crypto.randomUUID(),
      componente_nome: 'NOVO COMPONENTE',
      formula_largura: 'L',
      formula_altura: 'A',
      formula_perda: '1.10',
      quantidade: 1,
      sku_id: skus[0]?.id || '',
      tipo_regra: 'AREA' // AREA, PERIMETRO, FIXO
    };
    setFormData({ ...formData, regras_calculo: [...(formData.regras_calculo || []), newComponent] });
  };

  const removeComponent = (id: string) => {
    setFormData({ ...formData, regras_calculo: formData.regras_calculo.filter((c: any) => c.id !== id) });
  };

  const updateComponent = (id: string, updates: any) => {
    setFormData({ 
      ...formData, 
      regras_calculo: formData.regras_calculo.map((c: any) => c.id === id ? { ...c, ...updates } : c) 
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', padding: '1rem' }}>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
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
                      <button onClick={async () => {
                        if (confirm(`Tem certeza que deseja excluir o módulo "${p.nome}"?`)) {
                          try {
                            await api.engineering.delete(p.id);
                            fetchProducts();
                          } catch (err: any) {
                            alert('Erro ao excluir: ' + err.message);
                          }
                        }
                      }} className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Excluir</button>
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

          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)', fontWeight: 'bold' }}>Regras de Construção (BOM)</h4>
              <button type="button" onClick={addComponent} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Plus size={16} /> Add Peça
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxH: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {(formData.regras_calculo || []).map((comp: any) => (
                <div key={comp.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 40px', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <input 
                      className="input-base w-full" 
                      placeholder="Nome da Peça" 
                      value={comp.componente_nome} 
                      onChange={e => updateComponent(comp.id, { componente_nome: e.target.value.toUpperCase() })} 
                    />
                    <div>
                      <SearchableSelect
                        items={skus.map((s: any) => ({ id: s.id, label: s.nome || s.sku, sku: s.sku }))}
                        value={comp.sku_id}
                        placeholder="Selecione Material"
                        onChange={(id) => updateComponent(comp.id, { sku_id: id })}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                       <input type="number" className="input-base w-full" placeholder="Qtd" title="Quantidade de peças" value={comp.quantidade} onChange={e => updateComponent(comp.id, { quantidade: Number(e.target.value) })} />
                    </div>
                    <select 
                      className="input-base w-full" 
                      style={{ fontSize: '0.8rem' }}
                      value={comp.sentido_veio || 'longitudinal'} 
                      onChange={e => updateComponent(comp.id, { sentido_veio: e.target.value })}
                      title="Sentido do Veio"
                    >
                      <option value="longitudinal">Longitudinal</option>
                      <option value="transversal">Transversal</option>
                      <option value="sem_sentido">Sem Sentido</option>
                    </select>
                    <button type="button" onClick={() => removeComponent(comp.id)} style={{ all: 'unset', cursor: 'pointer', color: 'var(--danger)', textAlign: 'center' }}><X size={18} /></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Fórmula Largura (L)</label>
                      <input className="input-base w-full" style={{ fontSize: '0.8rem' }} value={comp.formula_largura} onChange={e => updateComponent(comp.id, { formula_largura: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Fórmula Altura (A)</label>
                      <input className="input-base w-full" style={{ fontSize: '0.8rem' }} value={comp.formula_altura} onChange={e => updateComponent(comp.id, { formula_altura: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Fator Perda</label>
                      <input className="input-base w-full" style={{ fontSize: '0.8rem' }} value={comp.formula_perda} onChange={e => updateComponent(comp.id, { formula_perda: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Desc. Fita (mm)</label>
                      <input type="number" required className="input-base w-full" style={{ fontSize: '0.8rem' }} value={comp.desconto_fita_mm || 0} onChange={e => updateComponent(comp.id, { desconto_fita_mm: Number(e.target.value) })} />
                    </div>
                  </div>
                </div>
              ))}
              {(!formData.regras_calculo || formData.regras_calculo.length === 0) && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem' }}>Nenhuma regra definida para este módulo.</p>
              )}
            </div>
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

