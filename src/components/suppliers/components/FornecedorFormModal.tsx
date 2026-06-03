import React, { useState, useEffect } from 'react';
import { useEscClose } from '../../../hooks/useEscClose';
import { useInventoryStore as useInventory } from '../../../stores/useInventoryStore';
import type { Fornecedor } from '../../../types/entities';
import { X, Save } from 'lucide-react';
import { Input, Modal, Button } from '../../../components/common';

interface FornecedorFormModalProps {
  fornecedor?: Fornecedor | null;
  onClose: () => void;
  onSuccess: (newSupplierId?: string) => void;
}

const FornecedorFormModal: React.FC<FornecedorFormModalProps> = ({
  fornecedor,
  onClose,
  onSuccess,
}) => {
  useEscClose(onClose);
  const { addFornecedor, updateFornecedor } = useInventory();
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
    observacoes: '',
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
        observacoes: fornecedor.observacoes || '',
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Input
          label="Razão Social / Nome *"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="CNPJ"
            value={form.cnpj}
            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
          />
          <Input
            label="Pessoa de Contato"
            value={form.contato}
            onChange={(e) => setForm({ ...form, contato: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Telefone"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cidade"
            value={form.cidade}
            onChange={(e) => setForm({ ...form, cidade: e.target.value })}
          />
          <Input
            label="Estado"
            maxLength={2}
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-2">Observações</label>
          <textarea
            className="flex w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            style={{ height: '80px', resize: 'none' }}
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />
        </div>

        {error && <p className="text-destructive text-sm text-center">{error}</p>}

        <div className="flex gap-4 mt-4">
          <Button type="button" onClick={onClose} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="flex-[2] flex items-center justify-center gap-2"
          >
            <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Fornecedor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FornecedorFormModal;
