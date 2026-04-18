import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import { Plus, RefreshCw, CalendarDays, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Localizador em Português
const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const messages = {
  allDay: 'Dia inteiro',
  previous: 'Anterior',
  next: 'Próximo',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Nenhum evento neste período.',
  showMore: (total: number) => `+ Ver mais (${total})`,
};

const CalendarioPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [responsavel, setResponsavel] = useState('todos');

  useEffect(() => {
    fetchEvents();
  }, [responsavel]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.agenda.list({ responsavel });
      const formatted = data.map(e => ({
        ...e,
        title: e.titulo,
        start: new Date(e.data_inicio),
        end: e.data_fim ? new Date(e.data_fim) : new Date(e.data_inicio),
        allDay: e.dia_inteiro,
      }));
      setEvents(formatted);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      await api.agenda.syncVisitas();
      fetchEvents();
    } catch (error) {
      alert('Erro ao sincronizar visitas');
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event: any) => {
    const backgroundColor = event.cor || 'var(--primary)';
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '0.75rem',
        padding: '2px 6px',
        fontWeight: '600'
      }
    };
  };

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: 'var(--primary)' }}>Agenda Unificada</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>Gestão centralizada de visitas, medições, entregas e instalações.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" onClick={handleSync} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Sincronizar Visitas
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} /> Novo Evento
          </button>
        </div>
      </header>

      <div className="card" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Filter size={16} /> Filtrar por:
            </div>
            <select 
                value={responsavel} 
                onChange={e => setResponsavel(e.target.value)}
                style={{ width: '180px', padding: '0.4rem' }}
            >
                <option value="todos">Todos os Setores</option>
                <option value="comercial">Comercial</option>
                <option value="producao">Produção / Montagem</option>
                <option value="ambos">Ambos</option>
            </select>
        </div>

        <div style={{ flex: 1, color: 'white' }} className="calendar-container">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            culture="pt-BR"
            messages={messages}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={event => console.log(event)}
            views={['month', 'week', 'day', 'agenda']}
            defaultView={Views.MONTH}
          />
        </div>
      </div>

      <style>{`
        .rbc-calendar {
          background: transparent;
        }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: rgba(255,b255,255,0.01);
        }
        .rbc-off-range-bg {
          background: rgba(0,0,0,0.1);
        }
        .rbc-today {
          background: rgba(226, 172, 0, 0.05);
        }
        .rbc-header {
          padding: 10px;
          font-weight: 700;
          color: var(--primary);
          border-bottom: 2px solid var(--border) !important;
        }
        .rbc-day-bg + .rbc-day-bg, .rbc-month-row + .rbc-month-row {
          border-left: 1px solid var(--border);
        }
        .rbc-month-row {
            border-top: 1px solid var(--border);
        }
        .rbc-toolbar button {
          color: var(--text) !important;
          border: 1px solid var(--border) !important;
          background: transparent !important;
        }
        .rbc-toolbar button:hover {
          background: rgba(255,255,255,0.05) !important;
        }
        .rbc-toolbar button.rbc-active {
          background: var(--primary) !important;
          color: var(--sidebar-bg) !important;
          border-color: var(--primary) !important;
        }
        .rbc-toolbar-label {
          font-weight: 800;
          font-size: 1.1rem;
          color: var(--text);
        }
        .rbc-agenda-view table.rbc-agenda-table {
          border: none;
        }
        .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
          border-bottom: 2px solid var(--border);
          color: var(--primary);
        }
      `}</style>
    </div>
  );
};

export default CalendarioPage;
