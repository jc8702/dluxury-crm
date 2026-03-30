import React, { useState } from 'react';
import KanbanBoard from '../../components/kanban/KanbanBoard';
import Modal from '../../components/common/Modal';
import { useAppContext } from '../../context/AppContext';

const VisitKanban: React.FC = () => {
  const { visits, updateKanbanStatus, addKanbanItem, updateKanbanItem } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    title: '', subtitle: '', label: '', status: 'a-agendar', 
    dateTime: '', visitFormat: 'Presencial' as 'Presencial' | 'Online', description: '' 
  });

  const columns = [
    { id: 'a-agendar', title: 'A Agendar' },
    { id: 'confirmada', title: 'Confirmada' },
    { id: 'realizada', title: 'Realizada' },
    { id: 'follow-up', title: 'Follow-up' },
  ];

  const handleMove = (id: string, newStatus: string) => {
    updateKanbanStatus('visit', id, newStatus);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      await updateKanbanItem(editingItem.id, formData);
    } else {
      await addKanbanItem({ ...formData, type: 'visit' });
    }
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({ 
      title: '', subtitle: '', label: '', status: 'a-agendar', 
      dateTime: '', visitFormat: 'Presencial', description: '' 
    });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      subtitle: item.subtitle || '',
      label: item.label || '',
      status: item.status,
      dateTime: item.dateTime || '',
      visitFormat: item.visitFormat || 'Presencial',
      description: item.description || ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Pipeline de Visitas</h2>
          <p style={{ color: 'var(--text-muted)' }}>Cronograma comercial de prospecção e relacionamento.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingItem(null); setFormData({ title: '', subtitle: '', label: '', status: 'a-agendar', dateTime: '', visitFormat: 'Presencial', description: '' }); setIsModalOpen(true); }}>+ Agendar Visita</button>
      </header>

      <KanbanBoard 
        items={visits} 
        columns={columns} 
        onMove={handleMove} 
        onEdit={handleEdit}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Visita Comercial">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Objetivo da Visita</label>
            <input className="input" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Cliente</label>
            <input className="input" required value={formData.subtitle} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Data e Hora</label>
              <input 
                type="datetime-local" 
                className="input" 
                value={formData.dateTime} 
                onChange={e => setFormData({ ...formData, dateTime: e.target.value })} 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Formato</label>
              <select 
                className="input" 
                value={formData.visitFormat} 
                onChange={e => setFormData({ ...formData, visitFormat: e.target.value as any })}
              >
                <option value="Presencial">Presencial</option>
                <option value="Online">Online / Reunião</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Notas / Objetivo (Label)</label>
            <input className="input" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Relatório / Detalhes</label>
            <textarea 
              className="input" 
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })} 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            {editingItem ? 'Salvar Alterações' : 'Adicionar ao Pipeline'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default VisitKanban;
