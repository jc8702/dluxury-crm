import React, { useState, useEffect, useRef } from 'react';
import { Bell, Info, AlertTriangle, AlertCircle, ShoppingCart, Calendar, FileText, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';
import type { Notificacao } from '../../api-lib/types';

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastErrorTimeRef = useRef<number>(0);

  const fetchNotifications = async () => {
    // Throttle de 5 minutos em caso de erro persistente para evitar flickering
    if (Date.now() - lastErrorTimeRef.current < 300000) return;

    try {
      const [list, count] = await Promise.all([
        api.notificacoes.list(true),
        api.notificacoes.getCount()
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (error) {
      console.error('Erro ao buscar notificações (Silenciado p/ estabilidade):', error);
      lastErrorTimeRef.current = Date.now();
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, url_destino?: string) => {
    try {
      await api.notificacoes.markRead(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (url_destino) {
        window.location.hash = url_destino; // Ou setActiveTab se passar via props
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critica': return '#EF4444';
      case 'alta': return '#F59E0B';
      case 'normal': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'estoque_critico': return <ShoppingCart size={16} />;
      case 'prazo_projeto': return <Calendar size={16} />;
      case 'orcamento_sem_resposta': return <FileText size={16} />;
      default: return <Info size={16} />;
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text)',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'background 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <Bell size={22} color={unreadCount > 0 ? 'var(--primary)' : 'currentColor'} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: '#EF4444',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            minWidth: '16px',
            height: '16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid var(--sidebar-bg)'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          width: '320px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '700', margin: 0 }}>Notificações</h3>
            <button
              onClick={() => api.notificacoes.markAllRead().then(() => fetchNotifications())}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '500' }}
            >
              Marcar lidas
            </button>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle size={32} style={{ marginBottom: '8px', opacity: 0.2 }} />
                <p style={{ fontSize: '0.8rem', margin: 0 }}>Nenhum alerta pendente</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id, n.url_destino)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      marginTop: '2px',
                      color: getPriorityColor(n.prioridade)
                    }}>
                      {getIcon(n.tipo)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: '700', margin: '0 0 2px 0', color: 'var(--text)' }}>
                        {n.titulo}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                        {n.mensagem}
                      </p>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                        {new Date(n.criado_em!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <button
            onClick={() => { setIsOpen(false); window.location.hash = '/notificacoes'; }}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(255,255,255,0.02)',
              border: 'none',
              borderTop: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Ver todas
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
