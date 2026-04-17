import React, { useState } from 'react';
import KanbanBoard from '../../components/kanban/KanbanBoard';
import Modal from '../ui/Modal';
import { useAppContext } from '../../context/AppContext';

const VisitKanban: React.FC = () => {
  const { visits, projects, clients, updateKanbanStatus, addKanbanItem, updateKanbanItem } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    contactName: '',
    email: '',
    phone: '',
    city: '',
    visitDate: '',
    visitTime: '',
    visitType: '📐 Medição',
    projectId: '',
    observations: '',
    status: 'a-agendar'
  });

  const columns = [
    { id: 'a-agendar', title: '📋 A Agendar' },
    { id: 'confirmada', title: '✅ Confirmada' },
    { id: 'realizada', title: '🏠 Realizada' },
    { id: 'follow-up', title: '📞 Follow-up' },
  ];

  const visitTypes = [
    { value: '📐 Medição', label: '📐 Medição' },
    { value: '🎨 Apresentação de Projeto', label: '🎨 Apresentação de Projeto' },
    { value: '📦 Entrega', label: '📦 Entrega' },
    { value: '🔧 Instalação', label: '🔧 Instalação' },
    { value: '🤝 Pós-venda', label: '🤝 Pós-venda' },
  ];

  const handleMove = (id: string, newStatus: string) => {
    updateKanbanStatus('visit', id, newStatus);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Verificar se o cliente já existe, senão faz pré-cadastro
    const existingClient = clients.find(c => c.nome.toLowerCase() === formData.title.toLowerCase());
    
    if (!existingClient && !editingItem) {
        // Pré-cadastro automático
        try {
            const newClientData = {
                nome: formData.title,
                telefone: formData.phone || '',
                cidade: formData.city || '',
                origem: 'outro' as const,
                observacoes: 'Gerado automaticamente via agendamento de visita.',
                status: 'ativo' as const
            };
            await useAppContext().addClient(newClientData);
        } catch (err) {
            console.error('Falha no pré-cadastro de cliente:', err);
        }
    }

    const dataToSave = { ...formData, type: 'visit' as const };

    if (editingItem) {
      await updateKanbanItem(editingItem.id, dataToSave);
    } else {
      await addKanbanItem(dataToSave);
    }

    closeModal();
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      contactName: item.contactName || '',
      email: item.email || '',
      phone: item.phone || '',
      city: item.city || '',
      visitDate: item.visitDate || '',
      visitTime: item.visitTime || '',
      visitType: item.visitType || '📐 Medição',
      projectId: item.projectId || '',
      observations: item.observations || item.description || '',
      status: item.status
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      title: '', contactName: '', email: '', phone: '', city: '',
      visitDate: '', visitTime: '', visitType: '📐 Medição',
      projectId: '', observations: '', status: 'a-agendar'
    });
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
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: '0.4rem',
    display: 'block'
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Agenda de Visitas</h2>
          <p style={{ color: 'var(--text-muted)' }}>Medições, entregas, instalações e pós-venda.</p>
        </div>
        <button className="btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          style={{
            background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e',
            fontWeight: '700', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer'
          }}>
          + Agendar Visita
        </button>
      </header>

      <KanbanBoard items={visits} columns={columns} onMove={handleMove} onEdit={handleEdit} />

      <Modal isOpen={isModalOpen} onClose={closeModal}
        title={editingItem ? "Editar Visita" : "Agendar Visita"} width="600px">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '80vh', overflowY: 'auto', paddingRight: '0.5rem' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Cliente (Nome ou Selecionar) *</label>
              <input 
                list="clients-list"
                required
                style={inputStyle}
                placeholder="Digite o nome do cliente..."
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
              <datalist id="clients-list">
                {clients.map(c => (
                  <option key={c.id} value={c.nome} />
                ))}
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Projeto Vinculado</label>
              <select style={selectStyle}
                value={formData.projectId}
                onChange={e => setFormData({ ...formData, projectId: e.target.value })}>
                <option value="" style={{ background: '#1a1a1a' }}>Nenhum</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} style={{ background: '#1a1a1a' }}>
                    {p.ambiente} — {p.clientName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Contato (nome)</label>
              <input style={inputStyle} placeholder="Quem vai receber"
                value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>WhatsApp</label>
              <input style={inputStyle} placeholder="(47) 99789-6229"
                value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Tipo de Visita *</label>
            <select style={selectStyle} required
              value={formData.visitType} onChange={e => setFormData({ ...formData, visitType: e.target.value })}>
              {visitTypes.map(t => (
                <option key={t.value} value={t.value} style={{ background: '#1a1a1a' }}>{t.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Data</label>
              <input type="date" style={inputStyle}
                value={formData.visitDate} onChange={e => setFormData({ ...formData, visitDate: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Hora</label>
              <input type="time" style={inputStyle}
                value={formData.visitTime} onChange={e => setFormData({ ...formData, visitTime: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Endereço/Bairro</label>
              <input style={inputStyle} placeholder="Bairro ou endereço"
                value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Observações</label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              placeholder="Detalhes da visita..."
              value={formData.observations} onChange={e => setFormData({ ...formData, observations: e.target.value })} />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn"
              style={{
                background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e',
                border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer'
              }}>
              ✓ {editingItem ? 'Salvar' : 'Agendar'}
            </button>
            <button type="button" onClick={closeModal}
              style={{ background: '#333', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VisitKanban;

