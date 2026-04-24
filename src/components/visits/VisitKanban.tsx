
import React, { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw } from 'lucide-react';
import KanbanBoard from '../../components/kanban/KanbanBoard';
import { useAppContext } from '../../context/AppContext';
import ModalEvento from '../agenda/ModalEvento';

const VisitKanban: React.FC = () => {
  const { events, visits, loadEvents, updateKanbanStatus } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const columns = [
    { id: 'agendado', title: '📋 AGENDADO' },
    { id: 'realizado', title: '🏠 REALIZADO' },
    { id: 'follow_up', title: '📞 FOLLOW-UP' },
  ];

  const fetchVisits = async () => {
    setLoading(true);
    await loadEvents();
    setLoading(false);
  };

  const handleMove = async (id: string, newStatus: string) => {
    try {
      setLoading(true);
      await updateKanbanStatus(id, newStatus);
    } catch (err) {
      alert('Erro ao mover visita');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    // Buscar o objeto completo (original) para edição
    const fullItem = events.find(e => e.id === item.id);
    setSelectedItem(fullItem);
    setIsModalOpen(true);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Estilizado */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ 
            padding: '1rem', 
            background: 'var(--icon-bg)', 
            borderRadius: 'var(--radius-md)', 
            color: 'var(--icon-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Users size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
              GESTÃO DE <span style={{ color: 'var(--primary)' }}>VISITAS</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500', marginTop: '0.25rem' }}>
              FLUXO COMERCIAL E TÉCNICO INTEGRADO À AGENDA INDUSTRIAL.
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-outline" 
            onClick={fetchVisits} 
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> ATUALIZAR
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => { setSelectedItem({ tipo: 'visita' }); setIsModalOpen(true); }}
            style={{ padding: '0.75rem 1.5rem' }}
          >
            <Plus size={20} /> AGENDAR VISITA
          </button>
        </div>
      </header>

      {/* Grid de Resumo Rápido (Opcional, mas melhora a UX) */}
      <div className="grid-3">
        {columns.map(col => (
          <div key={col.id} className="card glass" style={{ padding: '1rem', borderLeft: `3px solid ${col.id === 'agendado' ? 'var(--info)' : col.id === 'realizado' ? 'var(--success)' : 'var(--warning)'}` }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>{col.title}</p>
            <h4 style={{ fontSize: '1.5rem', margin: '0.25rem 0' }}>
              {visits.filter(v => v.status === col.id).length}
            </h4>
          </div>
        ))}
      </div>

      {/* Quadro Kanban */}
      <div style={{ position: 'relative', marginTop: '1rem' }}>
        {loading && (
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            zIndex: 10, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(0,0,0,0.2)', 
            backdropFilter: 'blur(2px)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <RefreshCw className="animate-spin" size={32} color="var(--primary)" />
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary)', letterSpacing: '0.1em' }}>SINCRONIZANDO...</span>
            </div>
          </div>
        )}
        <KanbanBoard 
          items={visits} 
          columns={columns} 
          onMove={handleMove} 
          onEdit={handleEdit} 
        />
      </div>

      <ModalEvento 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchVisits}
        eventToEdit={selectedItem}
      />
    </div>
  );
};

export default VisitKanban;
