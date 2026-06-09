import React, { useState } from 'react';
import { useInventoryStore as useInventory } from '../../stores/useInventoryStore';
import type { Fornecedor } from '../../types/entities';
import { useToast } from '../../context/ToastContext';
import { Truck, Plus, Search, Mail, Phone, MapPin, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../ui';
import { Card } from '../ui';
import FornecedorFormModal from './components/FornecedorFormModal';

const FornecedoresPage: React.FC = () => {
  const { error: toastError } = useToast();
  const { fornecedores, removeFornecedor, reloadInventoryData } = useInventory();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);

  const filtered = fornecedores.filter(
    (f) =>
      f.nome.toLowerCase().includes(search.toLowerCase()) || (f.cnpj && f.cnpj.includes(search)),
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
        reloadInventoryData();
      } catch (e: any) {
        toastError('Erro ao excluir fornecedor', e.message || 'Acesso negado');
      }
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="flex items-center gap-3 text-3xl font-black text-[var(--ui-text-primary)] m-0">
            <Truck size={28} className="text-[var(--ui-color-primary)]" /> Fornecedores
          </h2>
          <p className="text-[var(--ui-text-secondary)] text-sm mt-1">
            Gerencie seus parceiros de materiais e acabamentos.
          </p>
        </div>
        <Button onClick={handleNew} variant="primary" leftIcon={<Plus size={20} />}>
          Novo Fornecedor
        </Button>
      </header>

      <Card variant="flat" padding="sm" className="bg-[var(--ui-bg-subtle)]">
        <div className="relative max-w-[400px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)]"
          />
          <input
            className="input-base pl-10 w-full"
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((f) => (
          <Card
            key={f.id}
            variant="elevated"
            padding="lg"
            interactive
            className="flex flex-col gap-4"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 rounded-xl bg-[var(--ui-color-gold-50)] text-[var(--ui-color-gold-500)]">
                <Truck size={24} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(f)}
                  aria-label={`Editar fornecedor ${f.nome}`}
                >
                  <Edit2 size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(f.id)}
                  aria-label={`Excluir fornecedor ${f.nome}`}
                  className="text-[var(--ui-color-danger)]"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold m-0 text-[var(--ui-text-primary)]">{f.nome}</h4>
              <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
                {f.cnpj || 'CNPJ não informado'}
              </p>
            </div>

            <div className="flex flex-col gap-2 border-t border-[var(--ui-border)] pt-4 text-sm text-[var(--ui-text-secondary)]">
              {f.contato && (
                <div className="flex items-center gap-2">
                  <Edit2 size={14} /> <span>{f.contato}</span>
                </div>
              )}
              {f.telefone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} /> <span>{f.telefone}</span>
                </div>
              )}
              {f.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} /> <span>{f.email}</span>
                </div>
              )}
              {(f.cidade || f.estado) && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} />{' '}
                  <span>
                    {f.cidade}
                    {f.cidade && f.estado ? ', ' : ''}
                    {f.estado}
                  </span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <FornecedorFormModal
          fornecedor={selectedFornecedor}
          onClose={() => setShowModal(false)}
          onSuccess={reloadInventoryData}
        />
      )}
    </div>
  );
};

export default FornecedoresPage;
