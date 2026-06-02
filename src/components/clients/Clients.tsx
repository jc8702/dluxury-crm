import React, { useMemo, useState } from 'react';
import { Modal } from '../common';
import { useCrmStore as useCRM } from '../../stores/useCrmStore';
import { useToast } from '../../context/ToastContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import type { Client } from '../../types/entities';
import type { ClientFormData } from '../../validators';
import { ClientList } from '../../pages/Clients/ClientList';
import { ClientForm } from '../../pages/Clients/ClientForm';

const Clients: React.FC = () => {
  const { success: showToastSuccess } = useToast();
  const { handleError } = useErrorHandler();
  const { clients, projects, addClient, updateClient, removeClient } = useCRM();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const projectCountByName = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      const name = p.clientName;
      if (name) counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [projects]);

  const handleCreate = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = (client: Client) => {
    const ok = window.confirm(
      `Excluir o cliente "${client.nome}"? Esta ação não pode ser desfeita.`,
    );
    if (!ok) return;
    try {
      void removeClient(client.id);
      showToastSuccess('Removido', `Cliente "${client.nome}" foi excluído.`);
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
    <>
      <ClientList
        clients={clients}
        projectCountByName={projectCountByName}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingClient ? `Editar: ${editingClient.nome}` : 'Novo Cliente'}
        size="lg"
      >
        <ClientForm
          key={editingClient?.id || 'new'}
          initialData={editingClient}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </>
  );
};

export default Clients;
