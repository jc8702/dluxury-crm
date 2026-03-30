import React, { useState } from 'react';
import KanbanBoard from '../../components/kanban/KanbanBoard';
import Modal from '../../components/common/Modal';
import { useAppContext } from '../../context/AppContext';

const ProjectKanban: React.FC = () => {
  const { projects, updateKanbanStatus, addKanbanItem } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', subtitle: '', label: '', status: 'prospeccao' });

  const columns = [
    { id: 'prospeccao', title: 'Prospecção' },
    { id: 'em-andamento', title: 'Em Andamento' },
    { id: 'em-revisao', title: 'Em Revisão' },
    { id: 'concluido', title: 'Concluído' },
  ];

  const handleMove = (id: string, newStatus: string) => {
    updateKanbanStatus('project', id, newStatus);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addKanbanItem({ ...formData, type: 'project' });
    setIsModalOpen(false);
    setFormData({ title: '', subtitle: '', label: '', status: 'prospeccao' });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Gestão de Projetos</h2>
          <p style={{ color: 'var(--text-muted)' }}>Mapeamento de implementações técnicas.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Novo Projeto</button>
      </header>

      <KanbanBoard 
        items={projects} 
        columns={columns} 
        onMove={handleMove} 
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Projeto Tático">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Título do Projeto</label>
            <input className="input" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Cliente</label>
            <input className="input" required value={formData.subtitle} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Etiqueta (Ex: Prazo, Prioridade)</label>
            <input className="input" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }}>Adicionar ao Quadro</button>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectKanban;
