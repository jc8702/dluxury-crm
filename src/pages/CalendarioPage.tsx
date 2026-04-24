import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/addons/dragAndDrop';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import { 
  Plus, RefreshCw, ChevronLeft, ChevronRight, 
  Calendar as CalendarIcon, X, Check, AlertTriangle
} from 'lucide-react';
import { api } from '../lib/api';
import { useAppContext } from '../context/AppContext';
import ModalEvento from '../components/agenda/ModalEvento';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/addons/dragAndDrop/styles.css';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

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

const DARK_COLORS = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceHover: '#334155',
  border: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  primary: '#d4af37',
  primaryHover: '#e5c158',
};

const CalendarioPage: React.FC = () => {
  const { user, loadEvents } = useAppContext();
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
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
        setSelectedEvent(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal]);

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
      data_inicio: new Date(event.start).toISOString().slice(0, 16),
      data_fim: new Date(event.end).toISOString().slice(0, 16),
      dia_inteiro: event.allDay,
      cor: event.cor,
    });
    setShowModal(true);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedEvent({
      data_inicio: start.toISOString().slice(0, 16),
      data_fim: end.toISOString().slice(0, 16),
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
        data_inicio: dragConfirm.newStart.toISOString(),
        data_fim: dragConfirm.newEnd.toISOString(),
      });
      await loadEvents();
    } catch (err) {
      console.error('Erro ao mover evento:', err);
      alert('Erro ao alterar data do evento');
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

  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      background: DARK_COLORS.background,
      flexDirection: 'column' as const,
      color: DARK_COLORS.text,
    },
    header: {
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: `1px solid ${DARK_COLORS.border}`,
      background: DARK_COLORS.surface,
    },
    sidebar: {
      width: '280px',
      background: DARK_COLORS.surface,
      borderRight: `1px solid ${DARK_COLORS.border}`,
      padding: '20px',
      overflow: 'auto' as const,
    },
    btnPrimary: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      background: DARK_COLORS.primary,
      color: '#000',
      fontSize: '0.9rem',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
    },
    btnOutline: {
      padding: '8px 16px',
      border: `1px solid ${DARK_COLORS.border}`,
      borderRadius: '6px',
      background: 'transparent',
      color: DARK_COLORS.text,
      cursor: 'pointer',
    },
    title: {
      fontSize: '1.3rem',
      fontWeight: '700' as const,
      color: DARK_COLORS.text,
    },
    label: {
      fontSize: '0.75rem',
      fontWeight: '600' as const,
      color: DARK_COLORS.textMuted,
      marginBottom: '8px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
  };

  return (
    <div style={styles.container}>
      {/* HEADER PREMIUM */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => setDate(new Date())} style={styles.btnOutline}>
            HOJE
          </button>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => navigate(-1)} style={{ ...styles.btnOutline, padding: '8px', borderRadius: '6px' }}>
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => navigate(1)} style={{ ...styles.btnOutline, padding: '8px', borderRadius: '6px' }}>
              <ChevronRight size={20} />
            </button>
          </div>
          <h2 style={styles.title}>
            {format(date, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', background: DARK_COLORS.surfaceHover, borderRadius: '10px', padding: '4px' }}>
            {[
              { id: Views.WEEK, label: 'SEMANA' },
              { id: Views.MONTH, label: 'MÊS' },
              { id: Views.DAY, label: 'DIA' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: view === v.id ? DARK_COLORS.primary : 'transparent',
                  color: view === v.id ? '#000' : DARK_COLORS.textMuted,
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button onClick={fetchEvents} style={{ ...styles.btnOutline, padding: '10px' }}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button onClick={() => { setSelectedEvent(null); setShowModal(true); }} style={styles.btnPrimary}>
            <Plus size={18} />
            NOVO EVENTO
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* SIDEBAR DARK */}
        <aside style={styles.sidebar}>
          <button
            onClick={() => { setSelectedEvent(null); setShowModal(true); }}
            style={styles.btnPrimary}
          >
            <Plus size={20} />
            CRIAR
          </button>

          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <button onClick={() => { const d = new Date(date); d.setMonth(d.getMonth() - 1); setDate(d); }} style={{ ...styles.btnOutline, padding: '6px' }}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: '0.95rem', fontWeight: '600', color: DARK_COLORS.text }}>
                {format(date, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
              </span>
              <button onClick={() => { const d = new Date(date); d.setMonth(d.getMonth() + 1); setDate(d); }} style={{ ...styles.btnOutline, padding: '6px' }}>
                <ChevronRight size={18} />
              </button>
            </div>
            <Calendar
              localizer={localizer}
              date={date}
              onNavigate={setDate}
              view={Views.MONTH}
              onView={() => {}}
              events={[]}
              style={{ height: 260 }}
              toolbar={false}
            />
          </div>

          <div style={{ marginTop: '32px' }}>
            <h3 style={styles.label}>Calendários</h3>
            {calendars.map(cal => (
              <label key={cal.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 8px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px' }}>
                <input 
                  type="checkbox" 
                  checked={cal.visible}
                  onChange={() => toggleCalendar(cal.id)}
                  style={{ accentColor: DARK_COLORS.primary }}
                />
                <div style={{ width: '14px', height: '14px', background: cal.color, borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: DARK_COLORS.text }}>{cal.label}</span>
              </label>
            ))}
          </div>
        </aside>

        {/* CALENDAR AREA */}
        <div style={{ flex: 1, padding: '16px' }}>
          <DragAndDropCalendar
            localizer={localizer}
            events={events.filter(e => calendars.find(c => c.id === e.tipo)?.visible !== false)}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%', background: DARK_COLORS.surface, borderRadius: '16px', padding: '16px' }}
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
      {dragConfirm.show && dragConfirm.event && dragConfirm.newStart && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: DARK_COLORS.surface,
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            border: `1px solid ${DARK_COLORS.border}`,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                background: 'rgba(212, 175, 55, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <AlertTriangle size={28} color={DARK_COLORS.primary} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: DARK_COLORS.text, marginBottom: '8px' }}>
                Alterar Data/Hora?
              </h3>
              <p style={{ fontSize: '0.85rem', color: DARK_COLORS.textMuted }}>
                {dragConfirm.event?.title}
              </p>
              <div style={{ 
                marginTop: '12px', 
                padding: '12px', 
                background: 'rgba(212, 175, 55, 0.1)', 
                borderRadius: '8px',
                border: `1px solid ${DARK_COLORS.primary}`,
              }}>
                <p style={{ fontSize: '0.8rem', fontWeight: '600', color: DARK_COLORS.primary }}>
                  📅 {dragConfirm.newStart?.toLocaleDateString('pt-BR')}
                </p>
                <p style={{ fontSize: '0.8rem', color: DARK_COLORS.textMuted }}>
                  🕐 {dragConfirm.newStart?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} 
                  {' - '} 
                  {dragConfirm.newEnd?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleConfirmDrag(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${DARK_COLORS.border}`,
                  background: 'transparent',
                  color: DARK_COLORS.text,
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                CANCELAR
              </button>
              <button
                onClick={() => handleConfirmDrag(true)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: DARK_COLORS.primary,
                  color: '#000',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Check size={18} /> CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL STYLES */}
      <style>{`
        * { box-sizing: border-box; }
        
        .rbc-calendar { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
          background: ${DARK_COLORS.surface};
          border-radius: 16px;
        }
        .rbc-header { 
          padding: 14px 0; 
          font-weight: 700; 
          color: ${DARK_COLORS.textMuted}; 
          border-bottom: 1px solid ${DARK_COLORS.border};
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .rbc-month-view { 
          border: none; 
          border-radius: 12px;
        }
        .rbc-day-bg { 
          border-left: 1px solid ${DARK_COLORS.border} !important;
          background: ${DARK_COLORS.surface};
        }
        .rbc-day-bg + .rbc-day-bg { border-left: 1px solid ${DARK_COLORS.border} !important; }
        .rbc-month-row { border-top: none !important; }
        .rbc-month-row + .rbc-month-row { border-top: 1px solid ${DARK_COLORS.border} !important; }
        .rbc-off-range-bg { background: ${DARK_COLORS.background} !important; opacity: 0.6; }
        .rbc-today { 
          background: rgba(212, 175, 55, 0.15) !important;
        }
        .rbc-event { 
          border: none; 
          outline: none;
          font-weight: 600;
        }
        .rbc-event:focus { outline: 2px solid ${DARK_COLORS.primary}; }
        .rbc-time-view { 
          border: none; 
          background: ${DARK_COLORS.surface};
          border-radius: 12px;
        }
        .rbc-time-header { 
          border-bottom: 1px solid ${DARK_COLORS.border};
          background: ${DARK_COLORS.surface};
        }
        .rbc-time-content { border-top: 1px solid ${DARK_COLORS.border}; }
        .rbc-timeslot-group { border-bottom: 1px solid ${DARK_COLORS.border}; }
        .rbc-time-slot { border-top: 1px solid rgba(255,255,255,0.03); }
        .rbc-current-time-indicator {
          background: ${DARK_COLORS.primary};
          height: 2px;
        }
        .rbc-allday-cell { display: none; }
        .rbc-date-cell {
          padding: 8px;
          text-align: right;
          color: ${DARK_COLORS.textMuted};
        }
        .rbc-date-cell.rbc-now {
          color: ${DARK_COLORS.primary};
          font-weight: 700;
        }
        
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default CalendarioPage;