import React, { useState } from 'react';
import DataTable from '../ui/DataTable';
import { Button, Input, Modal, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../design-system/components';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import type { Client } from '../../context/AppContext';

const Clients: React.FC = () => {
  const { error: showToastError } = useToast();
  const { clients, projects, addClient, updateClient, removeClient } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [formData, setFormData] = useState<Omit<Client, 'id'>>({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    endereco: '',
    bairro: '',
    cidade: '',
    uf: '',
    tipoImovel: 'casa',
    comodosInteresse: [],
    origem: 'indicacao',
    observacoes: '',
    status: 'ativo'
  });

  const comodos = ['Cozinha', 'Quarto', 'Sala', 'Banheiro', 'Lavanderia', 'Closet', 'Home Office', 'Área Gourmet', 'Varanda'];
  
  const origemLabels: Record<string, string> = {
    indicacao: '👥 Indicação',
    instagram: '📸 Instagram',
    google: '🔍 Google',
    feira: '🎪 Feira/Evento',
    passante: '🚶 Passante',
    outro: '📌 Outro'
  };

  const filteredClients = clients.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefone?.includes(searchTerm) ||
    c.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  const paginatedClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleComodo = (comodo: string) => {
    setFormData(prev => ({
      ...prev,
      comodosInteresse: prev.comodosInteresse?.includes(comodo)
        ? prev.comodosInteresse.filter(c => c !== comodo)
        : [...(prev.comodosInteresse || []), comodo]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Map to API format (snake_case)
      const apiData = {
        razao_social: formData.nome, // backward compat with existing API
        nome: formData.nome,
        cpf: formData.cpf,
        telefone: formData.telefone,
        email: formData.email,
        endereco: formData.endereco,
        logradouro: formData.endereco, // backward compat
        bairro: formData.bairro,
        cidade: formData.cidade,
        municipio: formData.cidade, // backward compat
        uf: formData.uf,
        tipo_imovel: formData.tipoImovel,
        comodos_interesse: formData.comodosInteresse,
        origem: formData.origem,
        observacoes: formData.observacoes,
        historico: formData.observacoes, // backward compat
        status: formData.status,
        situacao_cadastral: formData.status === 'ativo' ? 'ATIVA' : 'INATIVA',
        cnpj: formData.cpf || '', // backward compat (field required in DB)
      };

      if (editingClient) {
        await updateClient(editingClient.id, apiData);
      } else {
        await addClient(apiData);
      }
      resetForm();
    } catch (error: any) {
      showToastError('Erro ao salvar cliente', error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '', cpf: '', telefone: '', email: '',
      endereco: '', bairro: '', cidade: '', uf: '',
      tipoImovel: 'casa', comodosInteresse: [], origem: 'indicacao',
      observacoes: '', status: 'ativo'
    });
    setEditingClient(null);
    setIsModalOpen(false);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      nome: client.nome,
      cpf: client.cpf || '',
      telefone: client.telefone,
      email: client.email || '',
      endereco: client.endereco || '',
      bairro: client.bairro || '',
      cidade: client.cidade || '',
      uf: client.uf || '',
      tipoImovel: client.tipoImovel || 'casa',
      comodosInteresse: client.comodosInteresse || [],
      origem: client.origem || 'indicacao',
      observacoes: client.observacoes || '',
      status: client.status || 'ativo'
    });
    setIsModalOpen(true);
  };

  const getProjectCount = (clientName: string) => {
    return projects.filter(p => p.clientName === clientName).length;
  };

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
          {client.tipoImovel === 'casa' ? '🏠' : client.tipoImovel === 'apartamento' ? '🏢' : '🏪'} {client.tipoImovel || '-'}
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
        <span className={`font-bold text-base ${
          getProjectCount(client.nome) > 0 ? 'text-primary' : 'text-muted-foreground'
        }`}>
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
        <Button onClick={() => { setEditingClient(null); resetForm(); setIsModalOpen(true); }}>
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

      <Modal isOpen={isModalOpen} onClose={resetForm}
        title={editingClient ? `Editar: ${editingClient.nome}` : "Novo Cliente"} size="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {sectionTitle('Dados Pessoais')}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
            <Input label="Nome Completo *" required placeholder="Ex: Maria da Silva"
              value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
            <Input label="CPF (opcional)" placeholder="000.000.000-00"
              value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} />
          </div>

          {sectionTitle('Contato')}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="WhatsApp *" required placeholder="(47) 99789-6229"
              value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} />
            <Input type="email" label="E-mail" placeholder="email@exemplo.com"
              value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>

          {sectionTitle('Endereço')}
          <Input label="Endereço" placeholder="Rua, número"
            value={formData.endereco} onChange={e => setFormData({ ...formData, endereco: e.target.value })} />
          <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr] gap-4">
            <Input label="Bairro" value={formData.bairro}
              onChange={e => setFormData({ ...formData, bairro: e.target.value })} />
            <Input label="Cidade" value={formData.cidade}
              onChange={e => setFormData({ ...formData, city: e.target.value, cidade: e.target.value })} />
            <Input label="UF" maxLength={2} placeholder="SC"
              value={formData.uf} onChange={e => setFormData({ ...formData, uf: e.target.value.toUpperCase() })} />
          </div>

          {sectionTitle('Perfil do Lead')}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/90">Tipo de Imóvel</label>
              <Select value={formData.tipoImovel} onValueChange={val => setFormData({ ...formData, tipoImovel: val as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casa">🏠 Casa</SelectItem>
                  <SelectItem value="apartamento">🏢 Apartamento</SelectItem>
                  <SelectItem value="comercial">🏪 Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/90">Como chegou</label>
              <Select value={formData.origem} onValueChange={val => setFormData({ ...formData, origem: val as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indicacao">👥 Indicação</SelectItem>
                  <SelectItem value="instagram">📸 Instagram</SelectItem>
                  <SelectItem value="google">🔍 Google</SelectItem>
                  <SelectItem value="feira">🎪 Feira/Evento</SelectItem>
                  <SelectItem value="passante">🚶 Passante</SelectItem>
                  <SelectItem value="outro">📌 Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/90">Cômodos de Interesse</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {comodos.map(c => {
                const isSelected = formData.comodosInteresse?.includes(c);
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
              value={formData.observacoes}
              onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
            />
          </div>

          <div className={`flex flex-col gap-2 p-4 rounded-xl border border-border mt-2 ${
            formData.status === 'ativo' ? 'bg-success/5 border-success/10' : 'bg-destructive/5 border-destructive/10'
          }`}>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
            <Select value={formData.status} onValueChange={val => setFormData({ ...formData, status: val as any })}>
              <SelectTrigger className={formData.status === 'ativo' ? 'text-success font-bold' : 'text-destructive font-bold'}>
                <SelectValue placeholder="Status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">✅ ATIVO</SelectItem>
                <SelectItem value="inativo">❌ INATIVO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" size="lg" fullWidth className="mt-4">
            {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default Clients;

