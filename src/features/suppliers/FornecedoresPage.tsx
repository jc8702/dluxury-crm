import React, { useState } from 'react';
import { useEscClose } from '../../hooks/useEscClose';
import { useAppContext } from '../../context/AppContext';
import type { Fornecedor } from '../../context/AppContext';
import { Truck, Plus, Search, Mail, Phone, MapPin, Edit2, Trash2, X, Save } from 'lucide-react';

const FornecedoresPage: React.FC = () => {
  const { fornecedores, addFornecedor, updateFornecedor, removeFornecedor } = useAppContext();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEscClose(() => { if (showModal) setShowModal(false); });

  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    contato: '',
    telefone: '',
    email: '',
    cidade: '',
    estado: '',
    observacoes: ''
  });

  const filtered = fornecedores.filter(f => 
    f.nome.toLowerCase().includes(search.toLowerCase()) || 
    (f.cnpj && f.cnpj.includes(search))
  );

  const handleEdit = (f: Fornecedor) => {
    setForm({
      nome: f.nome,
      cnpj: f.cnpj || '',
      contato: f.contato || '',
      telefone: f.telefone || '',
      email: f.email || '',
      cidade: f.cidade || '',
      estado: f.estado || '',
      observacoes: f.observacoes || ''
    });
    setEditingId(f.id);
    setShowModal(true);
  };

  const handleNew = () => {
    setForm({
      nome: '',
      cnpj: '',
      contato: '',
      telefone: '',
      email: '',
      cidade: '',
      estado: '',
      observacoes: ''
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateFornecedor(editingId, form);
      } else {
        await addFornecedor(form);
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este fornecedor?')) {
      await removeFornecedor(id);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Truck size={28} style={{ color: 'var(--primary)' }} /> Fornecedores
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Gerencie seus parceiros de materiais e acabamentos.
          </p>
        </div>
        <button onClick={handleNew} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} /> Novo Fornecedor
        </button>
      </header>

      <div className="card" style={{ padding: '0.75rem 1.25rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            className="input-base" 
            style={{ paddingLeft: '2.5rem', width: '100%' }}
            placeholder="Buscar por nome ou CNPJ..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid-3" style={{ gap: '1.5rem' }}>
        {filtered.map(f => (
          <div key={f.id} className="card hover-scale" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(212,175,55,0.1)', borderRadius: '12px', color: '#d4af37' }}>
                <Truck size={24} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleEdit(f)} style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-muted)' }}><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(f.id)} style={{ all: 'unset', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={16} /></button>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>{f.nome}</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{f.cnpj || 'CNPJ não informado'}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              {f.contato && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <Edit2 size={14} /> <span>{f.contato}</span>
                </div>
              )}
              {f.telefone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <Phone size={14} /> <span>{f.telefone}</span>
                </div>
              )}
              {f.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <Mail size={14} /> <span>{f.email}</span>
                </div>
              )}
              {(f.cidade || f.estado) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <MapPin size={14} /> <span>{f.cidade}{f.cidade && f.estado ? ', ' : ''}{f.estado}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content animate-pop-in" style={{ maxWidth: '600px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>
                {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-muted)' }}><X /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label-base">Razão Social / Nome *</label>
                <input className="input-base" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required />
              </div>
              <div className="grid-2">
                <div>
                  <label className="label-base">CNPJ</label>
                  <input className="input-base" value={form.cnpj} onChange={e => setForm({...form, cnpj: e.target.value})} />
                </div>
                <div>
                  <label className="label-base">Pessoa de Contato</label>
                  <input className="input-base" value={form.contato} onChange={e => setForm({...form, contato: e.target.value})} />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label className="label-base">Telefone</label>
                  <input className="input-base" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} />
                </div>
                <div>
                  <label className="label-base">E-mail</label>
                  <input type="email" className="input-base" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label className="label-base">Cidade</label>
                  <input className="input-base" value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} />
                </div>
                <div>
                  <label className="label-base">Estado</label>
                  <input className="input-base" maxLength={2} value={form.estado} onChange={e => setForm({...form, estado: e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div>
                <label className="label-base">Observações</label>
                <textarea className="input-base" style={{ height: '80px', resize: 'none' }} value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FornecedoresPage;
