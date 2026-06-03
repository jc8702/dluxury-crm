import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { Users, Plus, RefreshCw } from 'lucide-react';
import KanbanBoard from '../../components/kanban/KanbanBoard';
import { useCrmStore as useCRM } from '../../stores/useCrmStore';
import { Button, Card, CardContent } from '../../components/common';
import ModalEvento from '../agenda/ModalEvento';

const VisitKanban: React.FC = () => {
  const { error: toastError } = useToast();
  const { events, visits, loadEvents, updateKanbanStatus, removeVisit } = useCRM();
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const columns = [
    { id: 'agendado', title: '📋 AGENDADO' },
    { id: 'realizado', title: '✅ REALIZADO' },
    { id: 'follow_up', title: '📞 FOLLOW-UP' },
  ];

  const fetchVisits = async () => {
    setLoading(true);
    await loadEvents();
    setLoading(false);
  };

  React.useEffect(() => {
    fetchVisits();
  }, []);

  const handleMove = async (id: string, newStatus: string) => {
    try {
      setLoading(true);
      await updateKanbanStatus(id, newStatus);
    } catch (err: any) {
      console.error('[VisitKanban] Erro ao mover:', err);
      toastError(err?.message || err?.error || 'Erro ao mover visita');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    const fullItem = events.find((e) => String(e.id) === String(item.id));
    setSelectedItem(fullItem);
    setIsModalOpen(true);
  };

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      {/* Header Estilizado */}
      <header className="flex justify-between items-center pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-sm">
            <Users size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight uppercase">
              Gestão de <span className="text-primary">Visitas</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Fluxo comercial e técnico integrado à agenda industrial.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchVisits} disabled={loading}>
            <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Button
            onClick={() => {
              setSelectedItem({ tipo: 'visita' });
              setIsModalOpen(true);
            }}
          >
            <Plus size={20} className="mr-2" /> Agendar Visita
          </Button>
        </div>
      </header>

      {/* Grid de Resumo Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const borderClass =
            col.id === 'agendado'
              ? 'border-l-blue-500'
              : col.id === 'realizado'
                ? 'border-l-success'
                : 'border-l-amber-500';
          const count = visits.filter((v) => v.status === col.id).length;
          return (
            <Card key={col.id} className={`border-l-4 ${borderClass}`}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-bold uppercase">{col.title}</p>
                <h4 className="text-2xl font-extrabold mt-1">{count}</h4>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quadro Kanban */}
      <div className="relative mt-4">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[2px] rounded-2xl">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="animate-spin" size={32} color="hsl(var(--primary))" />
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
                Sincronizando...
              </span>
            </div>
          </div>
        )}
        <KanbanBoard
          title="Gestão de Visitas"
          items={visits}
          columns={columns}
          onMove={handleMove}
          onEdit={handleEdit}
          onDelete={removeVisit}
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
