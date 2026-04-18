import React, { useState, useEffect } from 'react';
import { 
  Bell, CheckCircle, Mail, AlertTriangle, 
  Trash2, Filter, Search, ChevronRight, 
  Clock, Package, FileText, Calendar, 
  Settings, RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';
import { Notificacao } from '../api-lib/types';

const NotificacoesPage: React.FC = () => {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'não_lidas'>('todas');

  useEffect(() => {
    fetchNotificacoes();
  }, [filter]);

  const fetchNotificacoes = async () => {
    setLoading(true);
    try {
      const data = await api.notificacoes.list(filter === 'não_lidas');
      setNotificacoes(data);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.notificacoes.markAllRead();
      fetchNotificacoes();
    } catch (error) {
      alert('Erro ao marcar todas como lidas');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.notificacoes.markRead(id);
      fetchNotificacoes();
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critica': return '#EF4444';
      case 'alta': return '#F59E0B';
      case 'normal': return '#3B82F6';
      default: return 'var(--text-muted)';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'estoque_critico': return <Package size={20} />;
      case 'prazo_projeto': return <Calendar size={20} />;
      case 'orcamento_sem_resposta': return <FileText size={20} />;
      case 'garantia_pendente': return <Mail size={20} />;
      default: return <Bell size={20} />;
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: 'var(--primary)' }}>Central de Notificações</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>Alertas automáticos do sistema e monitoramento de prazos críticos.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => api.notificacoes.generate().then(fetchNotificacoes)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={18} /> Forçar Verificação
            </button>
            <button className="btn-primary" onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} /> Marcar Todas como Lidas
            </button>
        </div>
      </header>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ 
          padding: '1rem 1.5rem', 
          borderBottom: '1px solid var(--border)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'rgba(255,b255,255,0.02)'
        }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <TabSmall active={filter === 'todas'} onClick={() => setFilter('todas')}>Todas</TabSmall>
                <TabSmall active={filter === 'não_lidas'} onClick={() => setFilter('não_lidas')}>Pendentes</TabSmall>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {notificacoes.length} notificações encontradas
            </div>
        </div>

        <div style={{ minHeight: '400px' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>Carregando...</div>
          ) : notificacoes.length === 0 ? (
            <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                <h3 style={{ margin: 0 }}>Tudo em dia!</h3>
                <p style={{ margin: '0.5rem 0 0' }}>Nenhuma notificação {filter === 'não_lidas' ? 'pendente' : 'registrada'}.</p>
            </div>
          ) : (
            notificacoes.map((n) => (
              <div 
                key={n.id} 
                className="notification-row"
                style={{ 
                  display: 'flex', 
                  gap: '1.5rem', 
                  padding: '1.5rem', 
                  borderBottom: '1px solid var(--border)',
                  background: n.lida ? 'transparent' : 'rgba(226, 172, 0, 0.03)',
                  transition: 'background 0.2s',
                  position: 'relative'
                }}
              >
                {!n.lida && (
                    <div style={{ 
                        position: 'absolute', 
                        left: 0, 
                        top: 0, 
                        bottom: 0, 
                        width: '4px', 
                        background: 'var(--primary)' 
                    }} />
                )}

                <div style={{ 
                    width: '42px', 
                    height: '42px', 
                    borderRadius: '50%', 
                    background: 'rgba(255,255,255,0.05)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: getPriorityColor(n.prioridade),
                    flexShrink: 0
                }}>
                  {getIcon(n.tipo)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text)' }}>
                      {n.titulo}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={12} /> {new Date(n.criado_em!).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p style={{ margin: '0.5rem 0 1rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    {n.mensagem}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {n.url_destino && (
                        <button 
                            className="btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            onClick={() => {
                                handleMarkRead(n.id);
                                window.location.hash = n.url_destino!;
                            }}
                        >
                            Ver Detalhes <ChevronRight size={14} />
                        </button>
                    )}
                    {!n.lida && (
                        <button 
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
                            onClick={() => handleMarkRead(n.id)}
                        >
                            Marcar como lida
                        </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .notification-row:hover {
          background: rgba(255,255,255,0.02) !important;
        }
      `}</style>
    </div>
  );
};

const TabSmall: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? 'rgba(226, 172, 0, 0.1)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--text-muted)',
      border: 'none',
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontWeight: '700',
      padding: '0.4rem 1rem',
      borderRadius: '20px',
      transition: 'all 0.2s'
    }}
  >
    {children}
  </button>
);

export default NotificacoesPage;
