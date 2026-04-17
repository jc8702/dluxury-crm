import React, { useState, useEffect } from 'react';
import { useEscClose } from '../../../hooks/useEscClose';
import { useAppContext } from '../../../context/AppContext';
import type { Fornecedor } from '../../../context/AppContext';
import { X, Save } from 'lucide-react';

interface FornecedorFormModalProps {
  fornecedor?: Fornecedor | null;
  onClose: () => void;
  onSuccess: (newSupplierId?: string) => void;
}

const FornecedorFormModal: React.FC<FornecedorFormModalProps> = ({ fornecedor, onClose, onSuccess }) => {
  useEscClose(onClose);
  const { addFornecedor, updateFornecedor } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (fornecedor) {
      setForm({
        nome: fornecedor.nome,
        cnpj: fornecedor.cnpj || '',
        contato: fornecedor.contato || '',
        telefone: fornecedor.telefone || '',
        email: fornecedor.email || '',
        cidade: fornecedor.cidade || '',
        estado: fornecedor.estado || '',
        observacoes: fornecedor.observacoes || ''
      });
    }
  }, [fornecedor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (fornecedor?.id) {
        await updateFornecedor(fornecedor.id, form);
        onSuccess();
      } else {
        const result = await addFornecedor(form);
        // Supondo que addFornecedor retorne o objeto com ID ou o ID diretamente
        onSuccess((result as any)?.id);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao salvar fornecedor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal-content animate-pop-in" style={{ maxWidth: '600px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>
            {fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </h3>
          <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-muted)' }}><X /></button>
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

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Fornecedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FornecedorFormModal;

