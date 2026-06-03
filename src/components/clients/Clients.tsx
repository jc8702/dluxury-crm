import React, { useMemo, useState } from 'react';
import { Plus, Users, UserCheck, UserX, Building2 } from 'lucide-react';
import { useCrmStore as useCRM } from '../../stores/useCrmStore';
import { useToast } from '../../context/ToastContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import type { Client } from '../../types/entities';
import type { ClientFormData } from '../../validators';
import { ClientList } from '../../pages/Clients/ClientList';
import { ClientForm } from '../../pages/Clients/ClientForm';
import { Button, Modal, Card, CardStat } from '../ui';
import { ConfirmDialog } from '../ui/Modal';

const Clients: React.FC = () => {
  const { success: showToastSuccess } = useToast();
  const { handleError } = useErrorHandler();
  const { clients, projects, addClient, updateClient, removeClient } = useCRM();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);

  const projectCountByName = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      const name = p.clientName;
      if (name) counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [projects]);

  const stats = useMemo(() => {
    const total = clients.length;
    const ativos = clients.filter((c) => (c.status || 'ativo') === 'ativo').length;
    const inativos = total - ativos;
    const cidades = new Set(clients.map((c) => (c.cidade || '').trim()).filter(Boolean)).size;
    return { total, ativos, inativos, cidades };
  }, [clients]);

  const handleCreate = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = (client: Client) => setPendingDelete(client);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    try {
      void removeClient(pendingDelete.id);
      showToastSuccess('Removido', `Cliente "${pendingDelete.nome}" foi excluído.`);
      setPendingDelete(null);
    } catch (error: unknown) {
      handleError(error);
    }
  };

  const handleCloseModal = () => {
    setEditingClient(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (data: ClientFormData) => {
    const apiData = {
      razao_social: data.nome,
      nome: data.nome,
      cpf: data.cpf,
      telefone: data.telefone,
      email: data.email,
      endereco: data.endereco,
      logradouro: data.endereco,
      bairro: data.bairro,
      cidade: data.cidade,
      municipio: data.cidade,
      uf: data.uf,
      tipo_imovel: data.tipoImovel,
      comodos_interesse: data.comodosInteresse,
      origem: data.origem,
      observacoes: data.observacoes,
      historico: data.observacoes,
      status: data.status,
      situacao_cadastral: data.status === 'ativo' ? 'ATIVA' : 'INATIVA',
    };

    try {
      if (editingClient) {
        await updateClient(editingClient.id, apiData);
        showToastSuccess('Sucesso', 'Cliente atualizado com sucesso!');
      } else {
        await addClient(apiData);
        showToastSuccess('Sucesso', 'Cliente cadastrado com sucesso!');
      }
      handleCloseModal();
    } catch (error: unknown) {
      handleError(error);
    }
  };

  return (
    <div className="ui-stack ui-gap-4 p-4 md:p-6 max-w-[1400px] ui-mx-auto">
      {/* ── Header ── */}
      <div className="ui-row-between flex-wrap ui-gap-3">
        <div>
          <h1 className="text-[var(--ui-text-2xl)] font-semibold tracking-tight">Clientes</h1>
          <p className="mt-0.5 text-[var(--ui-text-sm)] text-[var(--ui-text-secondary)]">
            Gerencie sua base de clientes e acompanhe o relacionamento.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={handleCreate}
        >
          Novo cliente
        </Button>
      </div>

      {/* ── Stats (4 cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 ui-gap-3">
        <CardStat
          label="Total"
          value={stats.total}
          icon={<Users className="h-4 w-4" />}
          tone="default"
        />
        <CardStat
          label="Ativos"
          value={stats.ativos}
          icon={<UserCheck className="h-4 w-4" />}
          tone="success"
        />
        <CardStat
          label="Inativos"
          value={stats.inativos}
          icon={<UserX className="h-4 w-4" />}
          tone="warning"
        />
        <CardStat
          label="Cidades"
          value={stats.cidades}
          icon={<Building2 className="h-4 w-4" />}
          tone="info"
        />
      </div>

      {/* ── Lista ── */}
      <Card variant="default" padding="none">
        <ClientList
          clients={clients}
          projectCountByName={projectCountByName}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Card>

      {/* ── Modal de edição/criação ── */}
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title={editingClient ? `Editar: ${editingClient.nome}` : 'Novo cliente'}
        description={
          editingClient
            ? 'Atualize os dados do cliente e salve as alterações.'
            : 'Preencha os dados para cadastrar um novo cliente.'
        }
        size="lg"
        placement="right"
        footer={
          <>
            <Button variant="ghost" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="client-form">
              {editingClient ? 'Salvar alterações' : 'Cadastrar cliente'}
            </Button>
          </>
        }
      >
        <ClientForm
          key={editingClient?.id || 'new'}
          initialData={editingClient}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>

      {/* ── Confirmação de exclusão ── */}
      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir cliente"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir "${pendingDelete.nome}"? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmText="Excluir"
        cancelText="Manter"
        tone="danger"
      />
    </div>
  );
};

export default Clients;
