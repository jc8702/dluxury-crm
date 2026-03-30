import React, { useState } from 'react';
import KanbanBoard from '../../components/kanban/KanbanBoard';
import Modal from '../../components/common/Modal';
import { useAppContext } from '../../context/AppContext';

const VisitKanban: React.FC = () => {
  const { visits, updateKanbanStatus, addKanbanItem } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', subtitle: '', label: '', status: 'a-agendar' });

  const columns = [
    { id: 'a-agendar', title: 'A Agendar' },
    { id: 'confirmada', title: 'Confirmada' },
    { id: 'realizada', title: 'Realizada' },
    { id: 'follow-up', title: 'Follow-up' },
  ];

  const handleMove = (id: string, newStatus: string) => {
    updateKanbanStatus('visit', id, newStatus);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addKanbanItem({ ...formData, type: 'visit' });
    setIsModalOpen(false);
    setFormData({ title: '', subtitle: '', label: '', status: 'a-agendar' });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Pipeline de Visitas</h2>
          <p style={{ color: 'var(--text-muted)' }}>Cronograma comercial de prospecção e relacionamento.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Agendar Visita</button>
      </header>

      <KanbanBoard 
        items={visits} 
        columns={columns} 
        onMove={handleMove} 
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Informação Adicional (Ex: Consultor, Horário)</label>
            <input className="input" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }}>Adicionar ao Pipeline</button>
        </form>
      </Modal>
    </div>
  );
};

export default VisitKanban;
