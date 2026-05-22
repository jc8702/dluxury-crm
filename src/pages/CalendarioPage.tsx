import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Views, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import { 
  Plus, RefreshCw, ChevronLeft, ChevronRight, 
  Check, AlertTriangle, Calendar as CalendarIcon
} from 'lucide-react';
import { Button, Modal } from '../design-system/components';
import { api } from '../lib/api';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ModalEvento from '../components/agenda/ModalEvento';
import { useEscClose } from '../hooks/useEscClose';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const toLocalString = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const DragAndDropCalendar = withDragAndDrop(Calendar);

const messages = {
  allDay: 'Dia inteiro',
  previous: 'Próximo',
  next: 'Anterior',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Nenhum evento neste período.',
  showMore: (total: number) => `+ mais (${total})`,
};

interface MyEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  tipo?: string;
  cor?: string;
  cliente_nome?: string;
  data_inicio?: string;
  data_fim?: string;
}

const CalendarioPage: React.FC = () => {
  const { loadEvents } = useAppContext();
  const { error: toastError } = useToast();
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [view, setView] = useState<any>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  
  const [dragConfirm, setDragConfirm] = useState<{
    show: boolean;
    event: MyEvent | null;
    newStart: Date | null;
    newEnd: Date | null;
  }>({ show: false, event: null, newStart: null, newEnd: null });

  const [calendars, setCalendars] = useState([
    { id: 'visita', label: 'Visitas Técnicas', color: '#00A99D', visible: true },
    { id: 'reuniao', label: 'Reuniões', color: '#3B82F6', visible: true },
    { id: 'compromisso', label: 'Compromissos', color: '#d4af37', visible: true },
    { id: 'deadline', label: 'Prazos', color: '#EF4444', visible: true },
  ]);

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEscClose(() => { setShowModal(false); setSelectedEvent(null); }, showModal);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.agenda.list();
      if (!data || !Array.isArray(data)) {
        setEvents([]);
        return;
      }
      const formatted: MyEvent[] = data.map((e: any) => {
        const start = new Date(e.data_inicio);
        const end = new Date(e.data_fim);
        return {
          ...e,
          id: e.id,
          title: e.titulo,
          start: start,
          end: end,
          allDay: !!e.dia_inteiro,
          tipo: e.tipo,
          cor: e.cor || getCorByTipo(e.tipo),
          cliente_nome: e.cliente_nome,
        };
      }).filter(e => e.start && !isNaN(e.start.getTime()));
      setEvents(formatted);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getCorByTipo = (tipo: string) => {
    const c = calendars.find(cal => cal.id === tipo);
    return c?.color || '#6b7280';
  };

  const handleSelectEvent = (event: MyEvent) => {
    setSelectedEvent({
      id: event.id,
      titulo: event.title,
      tipo: event.tipo,
      data_inicio: toLocalString(new Date(event.start)),
      data_fim: toLocalString(new Date(event.end)),
      dia_inteiro: event.allDay,
      cor: event.cor,
    });
    setShowModal(true);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedEvent({
      data_inicio: toLocalString(start),
      data_fim: toLocalString(end),
      tipo: 'compromisso',
    });
    setShowModal(true);
  };

  const handleEventDrop = useCallback(({ event, start, end }: { event: MyEvent; start: Date; end: Date }) => {
    setDragConfirm({
      show: true,
      event: event,
      newStart: start,
      newEnd: end,
    });
  }, []);

  const handleConfirmDrag = async (confirm: boolean) => {
    if (!confirm || !dragConfirm.event || !dragConfirm.newStart || !dragConfirm.newEnd) {
      setDragConfirm({ show: false, event: null, newStart: null, newEnd: null });
      fetchEvents();
      return;
    }

    try {
      setLoading(true);
      await api.agenda.update(dragConfirm.event.id, {
        data_inicio: new Date(dragConfirm.newStart).toISOString(),
        data_fim: new Date(dragConfirm.newEnd).toISOString(),
      });
      await loadEvents();
      fetchEvents();
    } catch (err) {
      console.error('Erro ao mover evento:', err);
      toastError('Erro ao alterar data do evento');
    } finally {
      setLoading(false);
      setDragConfirm({ show: false, event: null, newStart: null, newEnd: null });
    }
  };

  const eventStyleGetter = (event: MyEvent) => {
    const calendar = calendars.find(c => c.id === event.tipo);
    const isVisible = calendar?.visible !== false;
    const color = event.cor || calendar?.color || '#6b7280';
    return {
      style: {
        backgroundColor: isVisible ? color : 'transparent',
        borderRadius: '6px',
        opacity: isVisible ? 1 : 0.3,
        color: '#fff',
        border: 'none',
        display: 'block',
        fontSize: '0.75rem',
        padding: '3px 8px',
        fontWeight: '600',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }
    };
  };

  const toggleCalendar = (id: string) => {
    setCalendars(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const navigate = (direction: number) => {
    const newDate = new Date(date);
    if (view === Views.MONTH) newDate.setMonth(date.getMonth() + direction);
    else if (view === Views.WEEK) newDate.setDate(date.getDate() + (direction * 7));
    else if (view === Views.DAY) newDate.setDate(date.getDate() + direction);
    setDate(newDate);
  };

  return (
    <div className="page-container anim-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', padding: '1rem', gap: '1rem' }}>
      {/* HEADER PREMIUM */}
      <header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        borderRadius: '16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="outline" onClick={() => setDate(new Date())} style={{ fontSize: '0.85rem' }}>
            HOJE
          </Button>
          <div style={{ display: 'flex', gap: '4px' }}>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} style={{ padding: '0.5rem' }} aria-label="Anterior">
              <ChevronLeft size={18} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(1)} style={{ padding: '0.5rem' }} aria-label="Próximo">
              <ChevronRight size={18} />
            </Button>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={20} style={{ color: 'var(--primary)' }} />
            {format(date, "MMMM yyyy", { locale: ptBR })}
          </h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'hsl(var(--surface-hover))', borderRadius: '10px', padding: '3px', border: '1px solid var(--border)' }}>
            {[
              { id: Views.WEEK, label: 'SEMANA' },
              { id: Views.MONTH, label: 'MÊS' },
              { id: Views.DAY, label: 'DIA' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: view === v.id ? 'var(--primary)' : 'transparent',
                  color: view === v.id ? 'black' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: '0.2s',
                  letterSpacing: '0.05em',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          
          <Button variant="outline" onClick={fetchEvents} disabled={loading} style={{ padding: '0.6rem' }} aria-label="Atualizar agenda">
            <RefreshCw size={16} className={loading ? 'anim-spin' : ''} />
          </Button>
          
          <Button variant="primary" onClick={() => { setSelectedEvent(null); setShowModal(true); }} style={{ fontSize: '0.85rem' }}>
            <Plus size={16} style={{ marginRight: '0.25rem' }} /> NOVO EVENTO
          </Button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, gap: '1rem', overflow: 'hidden' }}>
        {/* SIDEBAR */}
        <aside style={{ 
          width: '280px', 
          background: 'var(--surface)', 
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '1.25rem', 
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          overflowY: 'auto'
        }} className="custom-scrollbar hidden md:flex">
          <Button variant="primary" onClick={() => { setSelectedEvent(null); setShowModal(true); }} style={{ width: '100%' }}>
            <Plus size={16} style={{ marginRight: '0.25rem' }} /> NOVO EVENTO
          </Button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <Button variant="ghost" size="sm" onClick={() => { const d = new Date(date); d.setMonth(d.getMonth() - 1); setDate(d); }} style={{ padding: '0.25rem' }}>
                <ChevronLeft size={16} />
              </Button>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'capitalize' }}>
                {format(date, "MMMM yyyy", { locale: ptBR })}
              </span>
              <Button variant="ghost" size="sm" onClick={() => { const d = new Date(date); d.setMonth(d.getMonth() + 1); setDate(d); }} style={{ padding: '0.25rem' }}>
                <ChevronRight size={16} />
              </Button>
            </div>
            
            <div className="mini-calendar-wrapper" style={{ fontSize: '0.75rem' }}>
              <Calendar
                localizer={localizer}
                date={date}
                onNavigate={setDate}
                view={Views.MONTH}
                onView={() => {}}
                events={[]}
                style={{ height: 220 }}
                toolbar={false}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtros de Visão</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {calendars.map(cal => (
                <label key={cal.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }} className="hover:bg-[hsl(var(--surface-hover))]">
                  <input 
                    type="checkbox" 
                    checked={cal.visible}
                    onChange={() => toggleCalendar(cal.id)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <div style={{ width: '12px', height: '12px', background: cal.color, borderRadius: '3px' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{cal.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* CALENDAR AREA */}
        <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <DragAndDropCalendar
            localizer={localizer}
            events={events.filter(e => calendars.find(c => c.id === e.tipo)?.visible !== false)}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            culture="pt-BR"
            messages={messages}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventDrop}
            selectable
            resizable
            view={view}
            onView={(v) => setView(v)}
            date={date}
            onNavigate={(d) => setDate(d)}
            toolbar={false}
            step={60}
            timeslots={1}
          />
        </div>
      </div>

      <ModalEvento 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); setSelectedEvent(null); }} 
        onSave={() => { fetchEvents(); setShowModal(false); setSelectedEvent(null); }}
        eventToEdit={selectedEvent}
      />

      {/* CONFIRM DRAG MODAL */}
      <Modal 
        isOpen={dragConfirm.show} 
        onClose={() => handleConfirmDrag(false)} 
        title="Alterar Data/Hora?"
      >
        {dragConfirm.event && dragConfirm.newStart && dragConfirm.newEnd && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              background: 'rgba(212, 175, 55, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}>
              <AlertTriangle size={24} style={{ color: 'var(--primary)' }} />
            </div>
            
            <div>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                {dragConfirm.event.title}
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Tem certeza de que deseja remarcar este evento para a nova data?
              </p>
            </div>
            
            <div style={{ 
              padding: '1rem', 
              background: 'hsl(var(--surface-hover))', 
              borderRadius: '12px',
              border: '1px solid var(--border)',
            }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', margin: '0 0 0.25rem 0' }}>
                📅 {dragConfirm.newStart.toLocaleDateString('pt-BR')}
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontFamily: 'monospace' }}>
                🕐 {dragConfirm.newStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} 
                {' - '} 
                {dragConfirm.newEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button variant="outline" onClick={() => handleConfirmDrag(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={() => handleConfirmDrag(true)}>
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* GLOBAL STYLES */}
      <style>{`
        .rbc-calendar { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
          background: transparent;
        }
        .rbc-header { 
          padding: 12px 0; 
          font-weight: 700; 
          color: var(--text-secondary); 
          border-bottom: 1px solid var(--border);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .rbc-month-view { 
          border: 1px solid var(--border) !important; 
          border-radius: 12px;
          overflow: hidden;
        }
        .rbc-day-bg { 
          border-left: 1px solid var(--border) !important;
        }
        .rbc-day-bg + .rbc-day-bg { border-left: 1px solid var(--border) !important; }
        .rbc-month-row { border-top: none !important; }
        .rbc-month-row + .rbc-month-row { border-top: 1px solid var(--border) !important; }
        .rbc-off-range-bg { background: rgba(255,255,255,0.01) !important; opacity: 0.5; }
        .rbc-today { 
          background: rgba(212, 175, 55, 0.08) !important;
        }
        .rbc-event { 
          border: none; 
          outline: none;
          font-weight: 600;
        }
        .rbc-event:focus { outline: 2px solid var(--primary); }
        .rbc-time-view { 
          border: 1px solid var(--border) !important; 
          border-radius: 12px;
          overflow: hidden;
        }
        .rbc-time-header { 
          background: var(--surface) !important;
        }
        .rbc-time-header-content {
          border-left: 1px solid var(--border) !important;
        }
        .rbc-time-content { border-top: 1px solid var(--border); }
        .rbc-timeslot-group { border-bottom: 1px solid var(--border); min-height: 50px; }
        .rbc-time-slot { border-top: 1px solid rgba(255,255,255,0.02); }
        .rbc-current-time-indicator {
          background: var(--primary);
          height: 2px;
        }
        .rbc-allday-cell { display: none; }
        .rbc-date-cell {
          padding: 6px;
          text-align: right;
          color: var(--text-secondary);
          font-size: 0.8rem;
        }
        .rbc-date-cell.rbc-now {
          color: var(--primary);
          font-weight: 800;
        }
        .rbc-label {
          color: var(--text-secondary) !important;
          font-size: 0.75rem;
          padding: 0 6px;
        }
        .rbc-month-row {
          overflow: visible !important;
        }
        
        .mini-calendar-wrapper .rbc-calendar {
          height: auto !important;
        }
        .mini-calendar-wrapper .rbc-month-view {
          border: none !important;
        }
        .mini-calendar-wrapper .rbc-date-cell {
          padding: 2px;
          text-align: center;
          font-size: 0.7rem;
        }
        .mini-calendar-wrapper .rbc-header {
          padding: 4px 0;
          font-size: 0.65rem;
        }
        .mini-calendar-wrapper .rbc-day-bg {
          border: none !important;
        }
        
        @media (max-width: 768px) {
          .hidden.md\\:flex {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CalendarioPage;