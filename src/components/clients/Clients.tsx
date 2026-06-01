import React, { useState } from 'react';
import DataTable from '../common/DataTable';
import { Button, Input, Modal, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/common';
import { useCrmStore as useCRM } from '../../stores/useCrmStore';
import { useToast } from '../../context/ToastContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import type { Client } from '../../types/entities';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cpfSchema, clientSchema, type ClientFormData } from '../../validators';


const Clients: React.FC = () => {
  const { success: showToastSuccess } = useToast();
  const { handleError } = useErrorHandler();
  const { clients, projects, addClient, updateClient, removeClient } = useCRM();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nome: '', cpf: '', telefone: '', email: '',
      endereco: '', bairro: '', cidade: '', uf: '',
      tipoImovel: 'casa', comodosInteresse: [], origem: 'indicacao',
      observacoes: '', status: 'ativo'
    }
  });

  const comodos = ['Cozinha', 'Quarto', 'Sala', 'Banheiro', 'Lavanderia', 'Closet', 'Home Office', 'Área Gourmet', 'Varanda'];
  
  const origemLabels: Record<string, string> = {
    indicacao: '👥 Indicação', instagram: '📸 Instagram', google: '🔍 Google',
    feira: '🎡 Feira/Evento', passante: '🚶 Passante', outro: '📌 Outro'
  };

  const filteredClients = clients.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefone?.includes(searchTerm) ||
    c.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  const paginatedClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const watchComodos = watch('comodosInteresse') || [];

  const toggleComodo = (comodo: string) => {
    const current = watchComodos;
    const next = current.includes(comodo) ? current.filter(c => c !== comodo) : [...current, comodo];
    setValue('comodosInteresse', next, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (data: ClientFormData) => {
    try {
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

  const handleCloseModal = () => {
    reset();
    setEditingClient(null);
    setIsModalOpen(false);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    reset({
      nome: client.nome,
      cpf: client.cpf || '',
      telefone: client.telefone,
      email: client.email || '',
      endereco: client.endereco || '',
      bairro: client.bairro || '',
      cidade: client.cidade || '',
      uf: client.uf || '',
      tipoImovel: (client.tipoImovel as any) || 'casa',
      comodosInteresse: client.comodosInteresse || [],
      origem: (client.origem as any) || 'indicacao',
      observacoes: client.observacoes || '',
      status: (client.status as any) || 'ativo'
    });
    setIsModalOpen(true);
  };

  const getProjectCount = (clientName: string) => projects.filter(p => p.clientName === clientName).length;

  const sectionTitle = (text: string) => (
    <div className="text-[10px] font-bold text-primary uppercase tracking-wider border-b border-border pb-1 mb-3 mt-5">
      {text}
    </div>
  );

  const headers = ['Cliente', 'WhatsApp', 'Cidade/UF', 'Origem', 'Projetos', 'Status', 'Ações'];

  const renderRow = (client: Client) => (
    <>
      <td className="p-4">
        <div className="font-semibold">{client.nome}</div>
        <div className="text-[11px] text-muted-foreground">
          {client.tipoImovel === 'casa' ? '🏠' : client.tipoImovel === 'apartamento' ? '🏢' : '🏭'} {client.tipoImovel || '-'}
        </div>
      </td>
      <td className="p-4">
        <a href={`https://wa.me/55${client.telefone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
          className="text-success font-semibold hover:underline text-sm flex items-center gap-1">
          📱 {client.telefone || '-'}
        </a>
      </td>
      <td className="p-4 text-sm text-foreground/80">{client.cidade ? `${client.cidade}/${client.uf}` : '-'}</td>
      <td className="p-4">
        <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          {origemLabels[client.origem || 'outro'] || client.origem}
        </span>
      </td>
      <td className="p-4 text-center">
        <span className={`font-bold text-base ${getProjectCount(client.nome) > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
          {getProjectCount(client.nome)}
        </span>
      </td>
      <td className="p-4">
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
          client.status === 'ativo' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
        }`}>
          {client.status === 'ativo' ? 'ATIVO' : 'INATIVO'}
        </span>
      </td>
      <td className="p-4">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 font-bold" onClick={() => handleEdit(client)}>
            Editar
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 font-bold" onClick={() => removeClient(client.id)}>
            Excluir
          </Button>
        </div>
      </td>
    </>
  );

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-muted-foreground">Gerencie sua base de clientes pessoa física.</p>
            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold border border-primary/20">
              {clients.length} Clientes
            </span>
          </div>
        </div>
        <Button onClick={() => { handleCloseModal(); setIsModalOpen(true); }}>
          + Novo Cliente
        </Button>
      </header>

      <div className="card p-6">
        <div className="flex gap-4 mb-6">
          <Input
            type="text"
            placeholder="Buscar por nome, telefone ou cidade..."
            className="flex-1"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <DataTable headers={headers} data={paginatedClients} renderRow={renderRow} />

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button variant="secondary" size="sm"
              disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>←</Button>
            {[...Array(totalPages)].map((_, idx) => (
              <Button key={idx} size="sm"
                variant={currentPage === idx + 1 ? 'primary' : 'secondary'}
                onClick={() => setCurrentPage(idx + 1)}>{idx + 1}</Button>
            ))}
            <Button variant="secondary" size="sm"
              disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>→</Button>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}
        title={editingClient ? `Editar: ${editingClient.nome}` : "Novo Cliente"} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

          {sectionTitle('Dados Pessoais')}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
            <Input label="Nome Completo *" placeholder="Ex: Maria da Silva" error={errors.nome?.message} {...register('nome')} />
            <Input label="CPF (opcional)" placeholder="000.000.000-00" error={errors.cpf?.message} {...register('cpf')} />
          </div>

          {sectionTitle('Contato')}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="WhatsApp *" placeholder="(47) 99789-6229" error={errors.telefone?.message} {...register('telefone')} />
            <Input type="email" label="E-mail" placeholder="email@exemplo.com" error={errors.email?.message} {...register('email')} />
          </div>

          {sectionTitle('Endereço')}
          <Input label="Endereço" placeholder="Rua, número" error={errors.endereco?.message} {...register('endereco')} />
          <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr] gap-4">
            <Input label="Bairro" error={errors.bairro?.message} {...register('bairro')} />
            <Input label="Cidade" error={errors.cidade?.message} {...register('cidade')} />
            <Input label="UF" maxLength={2} placeholder="SC" error={errors.uf?.message} {...register('uf')} onChange={(e) => {
              setValue('uf', e.target.value.toUpperCase());
            }} />
          </div>

          {sectionTitle('Perfil do Lead')}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/90">Tipo de Imóvel</label>
              <Controller
                name="tipoImovel"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.tipoImovel ? "border-destructive ring-destructive" : ""}>
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casa">🏠 Casa</SelectItem>
                      <SelectItem value="apartamento">🏢 Apartamento</SelectItem>
                      <SelectItem value="comercial">🏭 Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tipoImovel && <p className="text-xs text-destructive mt-1">{errors.tipoImovel.message}</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/90">Como chegou</label>
              <Controller
                name="origem"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.origem ? "border-destructive ring-destructive" : ""}>
                      <SelectValue placeholder="Selecione a origem..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indicacao">👥 Indicação</SelectItem>
                      <SelectItem value="instagram">📸 Instagram</SelectItem>
                      <SelectItem value="google">🔍 Google</SelectItem>
                      <SelectItem value="feira">🎡 Feira/Evento</SelectItem>
                      <SelectItem value="passante">🚶 Passante</SelectItem>
                      <SelectItem value="outro">📌 Outro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.origem && <p className="text-xs text-destructive mt-1">{errors.origem.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/90">Cômodos de Interesse</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {comodos.map(c => {
                const isSelected = watchComodos.includes(c);
                return (
                  <Button
                    key={c}
                    type="button"
                    variant={isSelected ? 'primary' : 'secondary'}
                    size="sm"
                    className="rounded-full"
                    onClick={() => toggleComodo(c)}
                  >
                    {c}
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/90">Observações</label>
            <textarea
              className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background min-h-[80px] resize-vertical transition-colors"
              placeholder="Notas sobre o cliente, referências, preferências..."
              {...register('observacoes')}
            />
          </div>

          <div className={`flex flex-col gap-2 p-4 rounded-xl border border-border mt-2 ${
             watch('status') === 'ativo' ? 'bg-success/5 border-success/10' : 'bg-destructive/5 border-destructive/10'
          }`}>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={field.value === 'ativo' ? 'text-success font-bold' : 'text-destructive font-bold'}>
                    <SelectValue placeholder="Status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">✅ ATIVO</SelectItem>
                    <SelectItem value="inativo">❌ INATIVO</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <Button type="submit" size="lg" fullWidth className="mt-4" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : (editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente')}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default Clients;
