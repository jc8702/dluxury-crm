import React, { useState } from 'react';

export interface KanbanItem {
  id: string;
  title: string;
  subtitle?: string;
  label?: string;
  status: string;
  color?: string;
}

interface KanbanBoardProps {
  items: KanbanItem[];
  columns: { id: string; title: string }[];
  onMove: (id: string, newStatus: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ items, columns, onMove }) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: string) => {
    if (draggedId) {
      onMove(draggedId, status);
      setDraggedId(null);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: '1.25rem', paddingBottom: '2rem' }}>
      {columns.map(col => (
        <div 
          key={col.id} 
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(col.id)}
          style={{ 
            background: 'rgba(30, 41, 59, 0.5)', 
            borderRadius: 'var(--radius-lg)', 
            padding: '1.25rem',
            minHeight: '400px',
            border: '2px dashed transparent',
            transition: 'border-color 0.2s ease'
          }}
          onDragEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {col.title}
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ({items.filter(i => i.status === col.id).length})
              </span>
            </h4>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.filter(i => i.status === col.id).map(item => (
              <div 
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item.id)}
                className="card"
                style={{ 
                  cursor: 'grab', 
                  padding: '1rem', 
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  userSelect: 'none',
                  opacity: draggedId === item.id ? 0.4 : 1
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{item.title}</p>
                  {item.subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{item.subtitle}</p>}
                  {item.label && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{item.label}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanBoard;
