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
  tag?: string;
}

interface KanbanBoardProps {
  items: KanbanItem[];
  columns: { id: string; title: string }[];
  onMove: (id: string, newStatus: string) => void;
  onEdit?: (item: KanbanItem) => void;
  onDelete?: (id: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ items, columns, onMove, onEdit, onDelete }) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedId) {
      onMove(draggedId, status);
    }
    setDraggedId(null);
  };

  return (
    <div
      className="grid pb-8"
      style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: '1.25rem' }}
    >
      {columns.map((col) => {
        const colItems = items.filter((i) => i.status === col.id);
        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className="bg-[var(--ui-bg-subtle)]/50 rounded-[var(--ui-radius-lg)] p-5 min-h-[400px] border-2 border-dashed border-transparent transition-colors duration-200"
            onDragEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--ui-color-primary)';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <div className="flex justify-between items-center mb-5">
              <h4 className="text-sm font-bold uppercase tracking-wide text-[var(--ui-text-primary)] m-0">
                {col.title}
                <span className="ml-2 text-xs text-[var(--ui-text-secondary)] font-normal">
                  ({colItems.length})
                </span>
              </h4>
              <div className="w-2 h-2 rounded-full bg-[var(--ui-color-primary)]" />
            </div>

            <div className="flex flex-col gap-3">
              {colItems.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onClick={() => onEdit && onEdit(item)}
                  className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-[var(--ui-radius-lg)] p-4 cursor-pointer select-none transition-all duration-200 hover:shadow-[var(--ui-shadow-2)]"
                  style={{ opacity: draggedId === item.id ? 0.4 : 1 }}
                >
                  <div className="flex flex-col gap-1 relative">
                    {item.tag && (
                      <div
                        className="text-[10px] font-black px-2 py-0.5 rounded-full w-fit mb-2"
                        style={{
                          background:
                            'linear-gradient(135deg, hsl(var(--accent)), hsl(38_50%_45%))',
                          color: 'hsl(var(--accent-foreground))',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                        }}
                      >
                        {item.tag}
                      </div>
                    )}

                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-bold uppercase mb-0.5 text-[var(--ui-text-primary)] m-0">
                          {item.title}
                        </p>
                      </div>
                    </div>

                    {item.subtitle && (
                      <p className="text-xs text-[var(--ui-color-primary)] m-0">{item.subtitle}</p>
                    )}

                    {(item.phone || item.city) && (
                      <div className="text-[10px] text-[var(--ui-text-secondary)] flex flex-wrap gap-2 mt-0.5">
                        {item.phone && <span>📞 {item.phone}</span>}
                        {item.city && <span>📍 {item.city}</span>}
                      </div>
                    )}

                    {item.dateTime && (
                      <div className="text-[10px] text-[var(--ui-text-secondary)] mt-1 flex items-center gap-1">
                        📅{' '}
                        {new Date(item.dateTime).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                    )}

                    {(item as any).visitDate && (
                      <div className="text-[11px] text-[var(--ui-color-gold-500)] mt-1.5 font-bold flex items-center gap-1.5">
                        🗓️ {new Date((item as any).visitDate).toLocaleDateString('pt-BR')}
                        {(item as any).visitTime && ` às ${(item as any).visitTime}`}
                      </div>
                    )}

                    {(item as any).visitType && (
                      <div className="text-[10px] text-[var(--ui-color-primary)] font-bold mt-0.5">
                        {(item as any).visitType}
                      </div>
                    )}

                    {item.visitFormat && (
                      <div
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-[10px] w-fit mt-1"
                        style={{
                          background:
                            item.visitFormat === 'Presencial'
                              ? 'var(--ui-color-success-soft)'
                              : 'var(--ui-color-info-soft)',
                          color:
                            item.visitFormat === 'Presencial'
                              ? 'var(--ui-color-success)'
                              : 'var(--ui-color-info)',
                        }}
                      >
                        {item.visitFormat}
                      </div>
                    )}

                    {item.badges && item.badges.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {item.badges.map((b, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--ui-color-primary)] text-[var(--ui-color-neutral-0)]"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    )}

                    {(item as any).value > 0 && (
                      <div className="mt-3 text-sm font-bold text-[var(--ui-color-gold-500)] border-t border-[var(--ui-border)] pt-2">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format((item as any).value)}
                      </div>
                    )}

                    {item.label && (
                      <div className="text-[11px] text-[var(--ui-text-secondary)] mt-2 border-t border-[var(--ui-border)] pt-2">
                        {item.label}
                      </div>
                    )}

                    {(onEdit || onDelete) && (
                      <div className="mt-3 pt-2 border-t border-[var(--ui-border)] flex justify-end gap-3">
                        {onEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(item);
                            }}
                            className="bg-transparent border-none text-[var(--ui-color-primary)] text-xs font-bold cursor-pointer px-1.5 py-0.5 rounded opacity-80 hover:opacity-100 hover:bg-[var(--ui-surface-hover)] transition-all"
                          >
                            Editar
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Tem certeza que deseja excluir este item?')) {
                                onDelete(item.id);
                              }
                            }}
                            className="bg-transparent border-none text-[var(--ui-color-danger)] text-xs font-bold cursor-pointer px-1.5 py-0.5 rounded opacity-80 hover:opacity-100 hover:bg-[var(--ui-color-danger-soft)] transition-all"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
