import React, { useState } from 'react';

export interface KanbanItem {
  id: string;
  title: string;
  subtitle?: string;
  label?: string;
  status: string;
  color?: string;
  dateTime?: string;
  visitFormat?: string;
  description?: string;
  badges?: string[];
  phone?: string;
  city?: string;
}

interface KanbanBoardProps {
  items: KanbanItem[];
  columns: { id: string; title: string }[];
  onMove: (id: string, newStatus: string) => void;
  onEdit?: (item: KanbanItem) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ items, columns, onMove, onEdit }) => {
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
                onClick={() => onEdit && onEdit(item)}
                className="card hover-scale"
                style={{ 
                  cursor: 'pointer', 
                  padding: '1rem', 
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  userSelect: 'none',
                  opacity: draggedId === item.id ? 0.4 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 'bold', flex: 1 }}>{item.title}</p>
                    {onEdit && (
                      <div 
                        style={{ color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.7 }}
                      >
                        Editar
                      </div>
                    )}
                  </div>
                  {item.subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{item.subtitle}</p>}
                  
                  {(item.phone || item.city) && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.2rem' }}>
                      {item.phone && <span>📞 {item.phone}</span>}
                      {item.city && <span>📍 {item.city}</span>}
                    </div>
                  )}

                  {item.dateTime && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      📅 {new Date(item.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  )}

                  {/* Detalhes específicos de Visita */}
                  {(item as any).visitDate && (
                    <div style={{ fontSize: '0.7rem', color: '#d4af37', marginTop: '0.4rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      🗓️ {new Date((item as any).visitDate).toLocaleDateString('pt-BR')} {(item as any).visitTime && ` às ${(item as any).visitTime}`}
                    </div>
                  )}

                  {(item as any).visitType && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 'bold', marginTop: '0.2rem' }}>
                      { (item as any).visitType }
                    </div>
                  )}

                  {item.visitFormat && (
                    <div style={{ 
                      fontSize: '0.6rem', 
                      background: item.visitFormat === 'Presencial' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(52, 115, 255, 0.1)',
                      color: item.visitFormat === 'Presencial' ? '#10b981' : 'var(--primary)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      width: 'fit-content',
                      marginTop: '0.25rem',
                      fontWeight: 'bold'
                    }}>
                      {item.visitFormat}
                    </div>
                  )}

                  {item.badges && item.badges.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {item.badges.map((b, idx) => (
                        <span key={idx} style={{ background: 'var(--primary)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Valor do Item (Projeto) */}
                  {(item as any).value > 0 && (
                    <div style={{ 
                      marginTop: '0.75rem', 
                      fontSize: '0.85rem', 
                      fontWeight: 'bold', 
                      color: '#d4af37',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      paddingTop: '0.5rem'
                    }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item as any).value)}
                    </div>
                  )}

                  {item.label && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>{item.label}</div>}
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

