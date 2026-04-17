import React, { useState } from 'react';
import DataTable from '../ui/DataTable';
import Modal from '../ui/Modal';
import { useAppContext } from '../../context/AppContext';
import type { Client } from '../../context/AppContext';

const Clients: React.FC = () => {
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
      alert('Erro ao salvar cliente: ' + error.message);
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

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.75rem',
    color: 'white',
    fontSize: '0.95rem',
    width: '100%',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '0.25rem',
    display: 'block'
  };

  const sectionTitle = (text: string) => (
    <div style={{
      fontSize: '0.7rem', fontWeight: 700, color: '#d4af37',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem',
      marginBottom: '0.75rem', marginTop: '1.25rem'
    }}>{text}</div>
  );

  const headers = ['Cliente', 'WhatsApp', 'Cidade/UF', 'Origem', 'Projetos', 'Status', 'Ações'];

  const renderRow = (client: Client) => (
    <>
      <td style={{ padding: '1rem' }}>
        <div style={{ fontWeight: '600' }}>{client.nome}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {client.tipoImovel === 'casa' ? '🏠' : client.tipoImovel === 'apartamento' ? '🏢' : '🏪'} {client.tipoImovel || '-'}
        </div>
      </td>
      <td style={{ padding: '1rem' }}>
        <a href={`https://wa.me/55${client.telefone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
          style={{ color: '#25D366', fontWeight: '600', textDecoration: 'none', fontSize: '0.9rem' }}>
          📱 {client.telefone || '-'}
        </a>
      </td>
      <td style={{ padding: '1rem' }}>{client.cidade ? `${client.cidade}/${client.uf}` : '-'}</td>
      <td style={{ padding: '1rem' }}>
        <span style={{
          fontSize: '0.7rem', fontWeight: 'bold',
          padding: '0.2rem 0.6rem', borderRadius: '12px',
          background: 'rgba(212, 175, 55, 0.1)', color: '#d4af37',
          border: '1px solid rgba(212, 175, 55, 0.2)'
        }}>
          {origemLabels[client.origem || 'outro'] || client.origem}
        </span>
      </td>
      <td style={{ padding: '1rem', textAlign: 'center' }}>
        <span style={{
          fontWeight: 'bold', fontSize: '1rem',
          color: getProjectCount(client.nome) > 0 ? '#d4af37' : 'var(--text-muted)'
        }}>
          {getProjectCount(client.nome)}
        </span>
      </td>
      <td style={{ padding: '1rem' }}>
        <span style={{
          padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold',
          background: client.status === 'ativo' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: client.status === 'ativo' ? '#10b981' : '#ef4444'
        }}>
          {client.status === 'ativo' ? 'ATIVO' : 'INATIVO'}
        </span>
      </td>
      <td style={{ padding: '1rem', display: 'flex', gap: '0.75rem' }}>
        <button onClick={() => handleEdit(client)}
          style={{ all: 'unset', cursor: 'pointer', color: '#d4af37', fontSize: '0.75rem', fontWeight: 'bold' }}>Editar</button>
        <button onClick={() => removeClient(client.id)}
          style={{ all: 'unset', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 'bold' }}>Excluir</button>
      </td>
    </>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Clientes</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Gerencie sua base de clientes pessoa física.</p>
            <span style={{
              background: 'rgba(212, 175, 55, 0.1)', color: '#d4af37',
              padding: '2px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }}>
              {clients.length} Clientes
            </span>
          </div>
        </div>
        <button className="btn" onClick={() => { setEditingClient(null); resetForm(); setIsModalOpen(true); }}
          style={{ background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e', fontWeight: '700', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}>
          + Novo Cliente
        </button>
      </header>

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <input
            type="text" className="input"
            placeholder="Buscar por nome, telefone ou cidade..."
            style={{ flex: 1 }}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <DataTable headers={headers} data={paginatedClients} renderRow={renderRow} />

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button className="btn" style={{ padding: '0.5rem 0.75rem', background: 'var(--surface)', border: '1px solid var(--border)' }}
              disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>←</button>
            {[...Array(totalPages)].map((_, idx) => (
              <button key={idx} className="btn"
                style={{
                  padding: '0.5rem 1rem',
                  background: currentPage === idx + 1 ? 'linear-gradient(135deg, #d4af37, #b49050)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: currentPage === idx + 1 ? '#1a1a2e' : 'var(--text-muted)',
                  fontWeight: 'bold'
                }}
                onClick={() => setCurrentPage(idx + 1)}>{idx + 1}</button>
            ))}
            <button className="btn" style={{ padding: '0.5rem 0.75rem', background: 'var(--surface)', border: '1px solid var(--border)' }}
              disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>→</button>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={resetForm}
        title={editingClient ? `Editar: ${editingClient.nome}` : "Novo Cliente"} width="700px">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

          {sectionTitle('Dados Pessoais')}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Nome Completo *</label>
              <input style={inputStyle} required placeholder="Ex: Maria da Silva"
                value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>CPF (opcional)</label>
              <input style={inputStyle} placeholder="000.000.000-00"
                value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} />
            </div>
          </div>

          {sectionTitle('Contato')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>WhatsApp *</label>
              <input style={inputStyle} required placeholder="(47) 99789-6229"
                value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>E-mail</label>
              <input type="email" style={inputStyle} placeholder="email@exemplo.com"
                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>

          {sectionTitle('Endereço')}
          <div>
            <label style={labelStyle}>Endereço</label>
            <input style={inputStyle} placeholder="Rua, número"
              value={formData.endereco} onChange={e => setFormData({ ...formData, endereco: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Bairro</label>
              <input style={inputStyle}
                value={formData.bairro} onChange={e => setFormData({ ...formData, bairro: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Cidade</label>
              <input style={inputStyle}
                value={formData.cidade} onChange={e => setFormData({ ...formData, cidade: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>UF</label>
              <input style={inputStyle} maxLength={2} placeholder="SC"
                value={formData.uf} onChange={e => setFormData({ ...formData, uf: e.target.value.toUpperCase() })} />
            </div>
          </div>

          {sectionTitle('Perfil do Lead')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Tipo de Imóvel</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }}
                value={formData.tipoImovel} onChange={e => setFormData({ ...formData, tipoImovel: e.target.value as any })}>
                <option value="casa" style={{ background: '#1a1a1a' }}>🏠 Casa</option>
                <option value="apartamento" style={{ background: '#1a1a1a' }}>🏢 Apartamento</option>
                <option value="comercial" style={{ background: '#1a1a1a' }}>🏪 Comercial</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Como chegou</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }}
                value={formData.origem} onChange={e => setFormData({ ...formData, origem: e.target.value as any })}>
                <option value="indicacao" style={{ background: '#1a1a1a' }}>👥 Indicação</option>
                <option value="instagram" style={{ background: '#1a1a1a' }}>📸 Instagram</option>
                <option value="google" style={{ background: '#1a1a1a' }}>🔍 Google</option>
                <option value="feira" style={{ background: '#1a1a1a' }}>🎪 Feira/Evento</option>
                <option value="passante" style={{ background: '#1a1a1a' }}>🚶 Passante</option>
                <option value="outro" style={{ background: '#1a1a1a' }}>📌 Outro</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Cômodos de Interesse</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
              {comodos.map(c => (
                <button key={c} type="button" onClick={() => toggleComodo(c)}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem',
                    fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                    border: formData.comodosInteresse?.includes(c) ? '1px solid #d4af37' : '1px solid var(--border)',
                    background: formData.comodosInteresse?.includes(c) ? 'rgba(212,175,55,0.15)' : 'transparent',
                    color: formData.comodosInteresse?.includes(c) ? '#d4af37' : 'var(--text-muted)',
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Observações</label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              placeholder="Notas sobre o cliente, referências, preferências..."
              value={formData.observacoes} onChange={e => setFormData({ ...formData, observacoes: e.target.value })} />
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem',
            background: formData.status === 'ativo' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
            borderRadius: '8px', border: '1px solid var(--border)'
          }}>
            <label style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>Status</label>
            <select style={{
              ...inputStyle, fontSize: '1.1rem', fontWeight: 'bold',
              color: formData.status === 'ativo' ? '#10b981' : '#ef4444'
            }}
              value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
              <option value="ativo">✅ ATIVO</option>
              <option value="inativo">❌ INATIVO</option>
            </select>
          </div>

          <button type="submit" className="btn"
            style={{
              marginTop: '1rem', padding: '1rem', justifyContent: 'center', fontSize: '1rem',
              background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e',
              fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer'
            }}>
            {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Clients;

