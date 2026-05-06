import React, { useState } from 'react';
import { useEscClose } from '../../hooks/useEscClose';
import { useAppContext } from '../../context/AppContext';
import type { Fornecedor } from '../../context/AppContext';
import { Truck, Plus, Search, Mail, Phone, MapPin, Edit2, Trash2, X, Save } from 'lucide-react';

import FornecedorFormModal from './components/FornecedorFormModal';

const FornecedoresPage: React.FC = () => {
  const { fornecedores, removeFornecedor, reloadData } = useAppContext();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);

  const filtered = fornecedores.filter(f => 
    f.nome.toLowerCase().includes(search.toLowerCase()) || 
    (f.cnpj && f.cnpj.includes(search))
  );

  const handleEdit = (f: Fornecedor) => {
    setSelectedFornecedor(f);
    setShowModal(true);
  };

  const handleNew = () => {
    setSelectedFornecedor(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este fornecedor?')) {
      try {
        await removeFornecedor(id);
      } catch (e: any) {
        alert("Erro ao excluir fornecedor: " + (e.message || "Acesso negado"));
      }
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
                <button 
                  onClick={() => handleEdit(f)} 
                  style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-muted)' }}
                  aria-label={`Editar fornecedor ${f.nome}`}
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(f.id)} 
                  style={{ all: 'unset', cursor: 'pointer', color: 'var(--danger)' }}
                  aria-label={`Excluir fornecedor ${f.nome}`}
                >
                  <Trash2 size={16} />
                </button>
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
        <FornecedorFormModal 
          fornecedor={selectedFornecedor}
          onClose={() => setShowModal(false)}
          onSuccess={() => { reloadData(); }} 
        />
      )}
    </div>
  );
};

export default FornecedoresPage;

