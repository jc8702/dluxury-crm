import React, { useState, useRef } from 'react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { useAppContext } from '../../context/AppContext';
import { parseCNPJFromPDF, parseFieldsFromText } from '../../services/cnpjParser';
import { renderPdfToCanvas, performOCR } from '../../services/ocrService';
import { fetchCNPJData } from '../../services/cnpjApi';
import type { Client } from '../../context/AppContext';

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ 
    fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', 
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', 
    marginBottom: '0.75rem', marginTop: '1rem'
  }}>
    {children}
  </div>
);

const Clients: React.FC = () => {
  const { clients, addClient, updateClient, removeClient } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Omit<Client, 'id'>>({
    cnpj: '', razaoSocial: '', nomeFantasia: '', porte: 'ME', dataAbertura: '',
    cnaePrincipal: '', cnaeSecundario: '', naturezaJuridica: '',
    logradouro: '', numero: '', complemento: '', cep: '', bairro: '', municipio: '', uf: '',
    email: '', telefone: '',
    situacaoCadastral: 'ATIVA', dataSituacaoCadastral: '', motivoSituacao: '',
    codigoErp: '', historico: '', frequenciaCompra: 'Mensal'
  });

  const filteredClients = clients.filter(c => 
    c.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cnpj.includes(searchTerm) ||
    c.codigoErp?.includes(searchTerm)
  );

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  const paginatedClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const applyData = (data: any) => {
    setFormData(prev => ({
      ...prev,
      cnpj: data.cnpj || prev.cnpj,
      razaoSocial: data.razaoSocial || prev.razaoSocial,
      nomeFantasia: data.nomeFantasia || prev.nomeFantasia,
      dataAbertura: data.dataAbertura || prev.dataAbertura,
      logradouro: data.logradouro || prev.logradouro,
      numero: data.numero || prev.numero,
      complemento: data.complemento || prev.complemento,
      cep: data.cep || prev.cep,
      bairro: data.bairro || prev.bairro,
      municipio: data.municipio || prev.municipio,
      uf: data.uf || prev.uf,
      email: data.email || prev.email,
      telefone: data.telefone || prev.telefone,
      porte: (data.porte as any) || prev.porte,
      naturezaJuridica: data.naturezaJuridica || prev.naturezaJuridica,
      cnaePrincipal: data.cnaePrincipal || prev.cnaePrincipal,
      situacaoCadastral: data.situacaoCadastral || prev.situacaoCadastral,
      frequenciaCompra: data.frequenciaCompra || prev.frequenciaCompra
    }));
  };

  const handleApiLookup = async () => {
    if (!formData.cnpj || formData.cnpj.replace(/\D/g, '').length !== 14) {
      alert('Por favor, digite um CNPJ válido com 14 números antes de consultar.');
      return;
    }

    setIsConsulting(true);
    try {
      const data = await fetchCNPJData(formData.cnpj);
      applyData(data);
      alert('Dados recuperados com sucesso da base do governo!');
    } catch (error: any) {
      console.error('Falha na consulta:', error);
      alert('Erro na consulta: ' + error.message);
    } finally {
      setIsConsulting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setOcrProgress('Lendo PDF...');
    
    try {
      const { data, rawText } = await parseCNPJFromPDF(file);
      
      if (!rawText.trim()) {
        const confirmOCR = window.confirm('Este PDF parece ser uma imagem. Deseja tentar a leitura por OCR (Visão Computacional)?');
        if (confirmOCR) {
          setOcrProgress('Processando imagem...');
          const canvas = await renderPdfToCanvas(file);
          const extractedText = await performOCR(canvas, (msg) => setOcrProgress(msg));
          const ocrData = parseFieldsFromText(extractedText);
          applyData(ocrData);
        }
      } else {
        applyData(data);
      }
    } catch (error: any) {
       alert('Erro ao importar PDF: ' + error.message);
    } finally {
      setIsParsing(false);
      setOcrProgress('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
      } else {
        await addClient(formData);
      }
      setFormData({
        cnpj: '', razaoSocial: '', nomeFantasia: '', porte: 'ME', dataAbertura: '',
        cnaePrincipal: '', cnaeSecundario: '', naturezaJuridica: '',
        logradouro: '', numero: '', complemento: '', cep: '', bairro: '', municipio: '', uf: '',
        email: '', telefone: '',
        situacaoCadastral: 'ATIVA', dataSituacaoCadastral: '', motivoSituacao: '',
        codigoErp: '', historico: '', frequenciaCompra: 'Mensal'
      });
      setEditingClient(null);
      setIsModalOpen(false);
    } catch (error: any) {
      alert('Erro ao salvar cliente: ' + error.message);
    }
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setFormData({
      cnpj: client.cnpj,
      razaoSocial: client.razaoSocial,
      nomeFantasia: client.nomeFantasia,
      porte: client.porte || 'ME',
      dataAbertura: client.dataAbertura,
      cnaePrincipal: client.cnaePrincipal,
      cnaeSecundario: client.cnaeSecundario,
      naturezaJuridica: client.naturezaJuridica,
      logradouro: client.logradouro,
      numero: client.numero,
      complemento: client.complemento,
      cep: client.cep,
      bairro: client.bairro,
      municipio: client.municipio,
      uf: client.uf,
      email: client.email,
      telefone: client.telefone,
      situacaoCadastral: client.situacaoCadastral || 'ATIVA',
      dataSituacaoCadastral: client.dataSituacaoCadastral,
      motivoSituacao: client.motivoSituacao,
      codigoErp: client.codigoErp,
      historico: client.historico,
      frequenciaCompra: client.frequenciaCompra || 'Mensal'
    });
    setIsModalOpen(true);
  };

  const headers = ['Razão Social', 'CNPJ', 'Município/UF', 'Situação', 'Recorrência', 'Cód. ERP', 'Ações'];

  const renderRow = (client: Client) => (
    <>
      <td style={{ padding: '1rem' }}>
        <div style={{ fontWeight: '600' }}>{client.razaoSocial}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{client.nomeFantasia}</div>
      </td>
      <td style={{ padding: '1rem' }}>{client.cnpj}</td>
      <td style={{ padding: '1rem' }}>{client.municipio} / {client.uf}</td>
      <td style={{ padding: '1rem' }}>
        <span style={{ 
          padding: '0.25rem 0.5rem', 
          borderRadius: '4px', 
          fontSize: '0.7rem', 
          fontWeight: 'bold',
          background: client.situacaoCadastral === 'ATIVA' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: client.situacaoCadastral === 'ATIVA' ? '#10b981' : '#ef4444'
        }}>
          {client.situacaoCadastral}
        </span>
      </td>
      <td style={{ padding: '1rem' }}>
        <span style={{ 
          fontSize: '0.75rem', 
          fontWeight: 'bold',
          color: 'var(--primary)',
          background: 'rgba(52, 115, 255, 0.05)',
          padding: '0.2rem 0.6rem',
          borderRadius: '12px',
          border: '1px solid rgba(52, 115, 255, 0.2)'
        }}>
          {client.frequenciaCompra || 'Mensal'}
        </span>
      </td>
      <td style={{ padding: '1rem' }}>
        <code style={{ background: 'var(--surface)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>
          {client.codigoErp || '-'}
        </code>
      </td>
      <td style={{ padding: '1rem', display: 'flex', gap: '0.75rem' }}>
        <button 
          onClick={() => handleEdit(client)}
          style={{ all: 'unset', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 'bold' }}
        >Editar</button>
        <button 
          onClick={() => removeClient(client.id)}
          style={{ all: 'unset', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 'bold' }}
        >Excluir</button>
      </td>
    </>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Gestão de Clientes</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Consulte e gerencie a base oficial de CNPJs.</p>
            <span style={{ 
              background: 'var(--primary-glow)', 
              color: 'var(--primary)', 
              padding: '2px 10px', 
              borderRadius: '20px', 
              fontSize: '0.7rem', 
              fontWeight: 'bold',
              border: '1px solid var(--border)'
            }}>
              {clients.length} Clientes no Total
            </span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingClient(null); setIsModalOpen(true); }}>+ Novo Cliente</button>
      </header>

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <input 
            type="text" 
            className="input" 
            placeholder="Buscar por razão social, CNPJ ou Código ERP..." 
            style={{ flex: 1 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <DataTable 
          headers={headers} 
          data={paginatedClients} 
          renderRow={renderRow} 
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button 
              className="btn" 
              style={{ padding: '0.5rem 0.75rem', background: 'var(--surface)', border: '1px solid var(--border)' }}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              ←
            </button>
            
            {[...Array(totalPages)].map((_, idx) => (
              <button
                key={idx}
                className="btn"
                style={{ 
                  padding: '0.5rem 1rem', 
                  background: currentPage === idx + 1 ? 'var(--primary)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: currentPage === idx + 1 ? 'white' : 'var(--text-muted)',
                  fontWeight: 'bold'
                }}
                onClick={() => setCurrentPage(idx + 1)}
              >
                {idx + 1}
              </button>
            ))}

            <button 
              className="btn" 
              style={{ padding: '0.5rem 0.75rem', background: 'var(--surface)', border: '1px solid var(--border)' }}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              →
            </button>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingClient(null); }} 
        title={editingClient ? `Editar Cliente: ${editingClient.razaoSocial}` : "Cadastrar Novo Cliente"}
        width="800px"
      >
        <div style={{ 
          marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface)', 
          borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', 
          textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <div style={{ flex: 1, maxWidth: '300px' }}>
              <input 
                className="input" 
                placeholder="00.000.000/0000-00"
                style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', border: '2px solid var(--primary)' }}
                value={formData.cnpj} 
                onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
              />
            </div>
            <button 
              className="btn" 
              onClick={handleApiLookup}
              disabled={isConsulting}
              style={{ background: 'var(--primary)', color: 'white', minWidth: '150px' }}
            >
              {isConsulting ? 'Consultando...' : '🔍 Consultar API'}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
             Digite o número do CNPJ para buscar os dados oficiais instantaneamente.
          </p>
          
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <input type="file" accept=".pdf" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} />
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
              {isParsing ? `[ ${ocrProgress} ]` : '📄 Outra opção: Importar PDF/Foto'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          
          <SectionTitle>Seção 1 — Identificação</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Número de Inscrição (CNPJ)</label>
              <input 
                className="input" placeholder="00.000.000/0000-00"
                value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Data de Abertura</label>
              <input 
                className="input" placeholder="XX/XX/XXXX"
                value={formData.dataAbertura} onChange={e => setFormData({ ...formData, dataAbertura: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nome Empresarial (Razão Social)</label>
            <input 
              className="input"
              value={formData.razaoSocial} onChange={e => setFormData({ ...formData, razaoSocial: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Título do Estabelecimento (Nome Fantasia)</label>
              <input 
                className="input"
                value={formData.nomeFantasia} onChange={e => setFormData({ ...formData, nomeFantasia: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Porte</label>
              <select 
                className="input"
                value={formData.porte} onChange={e => setFormData({ ...formData, porte: e.target.value as any })}
              >
                <option value="ME">ME</option>
                <option value="EPP">EPP</option>
                <option value="Demais">Demais</option>
              </select>
            </div>
          </div>

          <SectionTitle>Seção 2 — Atividade Econômica</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Código e Atividade Econômica Principal (CNAE)</label>
              <input 
                className="input" placeholder="73.19-0-02 – Promoção de vendas"
                value={formData.cnaePrincipal} onChange={e => setFormData({ ...formData, cnaePrincipal: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Código e Descrição da Natureza Jurídica</label>
              <input 
                className="input" placeholder="213-5 – Empresário Individual"
                value={formData.naturezaJuridica} onChange={e => setFormData({ ...formData, naturezaJuridica: e.target.value })}
              />
            </div>
          </div>

          <SectionTitle>Seção 3 — Endereço</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '7fr 1.5fr 1.5fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Logradouro</label>
              <input 
                className="input"
                value={formData.logradouro} onChange={e => setFormData({ ...formData, logradouro: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Número</label>
              <input 
                className="input"
                value={formData.numero} onChange={e => setFormData({ ...formData, numero: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Compl.</label>
              <input 
                className="input"
                value={formData.complemento} onChange={e => setFormData({ ...formData, complemento: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 3.5fr 3.5fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>CEP</label>
              <input 
                className="input"
                value={formData.cep} onChange={e => setFormData({ ...formData, cep: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Bairro/Distrito</label>
              <input 
                className="input"
                value={formData.bairro} onChange={e => setFormData({ ...formData, bairro: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Município</label>
              <input 
                className="input"
                value={formData.municipio} onChange={e => setFormData({ ...formData, municipio: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>UF</label>
              <input 
                className="input"
                value={formData.uf} onChange={e => setFormData({ ...formData, uf: e.target.value })}
              />
            </div>
          </div>

          <SectionTitle>Seção 4 — Contato</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Endereço Eletrônico (E-mail)</label>
              <input 
                type="email" className="input"
                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Telefone</label>
              <input 
                className="input" placeholder="(47) 99789-6229"
                value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })}
              />
            </div>
          </div>

          <SectionTitle>Seção 5 — Situação Cadastral</SectionTitle>
          <div style={{ 
            display: 'flex', justifyContent: 'center', padding: '1rem', 
            background: formData.situacaoCadastral === 'ATIVA' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
            borderRadius: 'var(--radius-md)'
          }}>
            <span style={{ 
              fontSize: '1.2rem', fontWeight: 'bold', 
              color: formData.situacaoCadastral === 'ATIVA' ? '#10b981' : '#ef4444' 
            }}>
              SITUAÇÃO: {formData.situacaoCadastral}
            </span>
          </div>

          <SectionTitle>Seção 6 — Integração Interna</SectionTitle>
          <div style={{ 
            display: 'flex', flexDirection: 'column', gap: '0.5rem', 
            padding: '1rem', background: 'rgba(52, 115, 255, 0.05)', borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(52, 115, 255, 0.2)'
          }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--primary)' }}>CÓDIGO ERP</label>
            <input 
              className="input" 
              style={{ border: '2px solid var(--primary)', fontWeight: '600' }}
              placeholder="Ex: ERP-12345"
              value={formData.codigoErp} onChange={e => setFormData({ ...formData, codigoErp: e.target.value })}
            />
          </div>

          <SectionTitle>Seção 8 — Perfil de Compra</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Frequência de Compra Estimada</label>
            <select 
              className="input"
              value={formData.frequenciaCompra} onChange={e => setFormData({ ...formData, frequenciaCompra: e.target.value as any })}
            >
              <option value="Mensal">Mensal</option>
              <option value="Bimestral">Bimestral</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Semestral">Semestral</option>
              <option value="Anual">Anual</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem', padding: '1rem', justifyContent: 'center', fontSize: '1rem' }}>
            Salvar Registro de Cliente
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Clients;
