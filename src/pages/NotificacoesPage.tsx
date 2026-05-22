import React, { useState, useEffect } from 'react';
import { 
  Bell, CheckCircle, Mail, 
  ChevronRight, 
  Clock, Package, FileText, Calendar, 
  RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';
import type { Notificacao } from '../api-lib/types';
import { useToast } from '../context/ToastContext';
import { CardSkeleton } from '../design-system/components/Skeleton';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '../design-system/components';

const NotificacoesPage: React.FC = () => {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'não_lidas'>('todas');
  const { error: toastError, success: toastSuccess } = useToast();

  useEffect(() => {
    fetchNotificacoes();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

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
      toastSuccess('Todas as notificações foram marcadas como lidas');
    } catch (_error) {
      toastError('Erro ao marcar todas como lidas');
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
      case 'critica': return 'hsl(var(--destructive))';
      case 'alta': return 'hsl(var(--warning))';
      case 'normal': return 'hsl(var(--primary))';
      default: return 'hsl(var(--muted-foreground))';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critica': return 'destructive';
      case 'alta': return 'warning';
      case 'normal': return 'primary';
      default: return 'outline';
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
    <div className="page-container anim-fade-in" style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <Bell style={{ color: 'hsl(var(--primary))' }} /> CENTRAL DE NOTIFICAÇÕES
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem', margin: 0 }}>Alertas automáticos do sistema e monitoramento de prazos críticos</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="outline" onClick={() => (api.notificacoes as any).generate().then(fetchNotificacoes)} style={{ fontSize: '0.85rem' }}>
            <RefreshCw size={16} style={{ marginRight: '0.25rem' }} /> Forçar Verificação
          </Button>
          <Button variant="primary" onClick={markAllRead} style={{ fontSize: '0.85rem' }}>
            <CheckCircle size={16} style={{ marginRight: '0.25rem' }} /> Marcar Todas como Lidas
          </Button>
        </div>
      </div>

      <Card style={{ overflow: 'hidden' }}>
        <CardHeader style={{ 
          padding: '1rem 1.5rem', 
          borderBottom: '1px solid hsl(var(--border))', 
          display: 'flex', 
          flexDirection: 'row',
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button 
              variant={filter === 'todas' ? 'primary' : 'ghost'} 
              size="sm"
              onClick={() => setFilter('todas')}
              style={{ borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}
            >
              Todas
            </Button>
            <Button 
              variant={filter === 'não_lidas' ? 'primary' : 'ghost'} 
              size="sm"
              onClick={() => setFilter('não_lidas')}
              style={{ borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}
            >
              Pendentes
            </Button>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
            {notificacoes.length} notificação{notificacoes.length !== 1 ? 'es' : ''} encontrada{notificacoes.length !== 1 ? 's' : ''}
          </div>
        </CardHeader>

        <CardContent style={{ padding: 0, minHeight: '400px' }}>
          {loading ? (
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : notificacoes.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '1rem', color: 'hsl(var(--muted-foreground))' }}>
              <CheckCircle size={48} style={{ color: 'hsl(var(--success))', opacity: 0.8 }} />
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>Tudo em dia!</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>Nenhuma notificação {filter === 'não_lidas' ? 'pendente' : 'registrada'}.</p>
              </div>
            </div>
          ) : (
            <div>
              {notificacoes.map((n) => (
                <div 
                  key={n.id} 
                  style={{ 
                    display: 'flex', 
                    gap: '1.25rem', 
                    padding: '1.25rem 1.5rem', 
                    borderBottom: '1px solid hsl(var(--border))',
                    background: n.lida ? 'transparent' : 'rgba(212, 175, 55, 0.02)',
                    transition: 'background 0.2s',
                    position: 'relative'
                  }}
                  className="hover:bg-[rgba(255,255,255,0.01)]"
                >
                  {!n.lida && (
                    <div style={{ 
                      position: 'absolute', 
                      left: 0, 
                      top: 0, 
                      bottom: 0, 
                      width: '4px', 
                      background: 'hsl(var(--primary))' 
                    }} />
                  )}

                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: 'rgba(255,255,255,0.04)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: getPriorityColor(n.prioridade),
                    flexShrink: 0
                  }}>
                    {getIcon(n.tipo)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>
                          {n.titulo}
                        </h4>
                        <Badge variant={getPriorityBadgeVariant(n.prioridade)} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                          {n.prioridade.toUpperCase()}
                        </Badge>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={12} /> {new Date(n.created_at!).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    
                    <p style={{ margin: '0.5rem 0 0.85rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem', lineHeight: '1.5' }}>
                      {n.mensagem}
                    </p>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {n.url_destino && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                          onClick={() => {
                            handleMarkRead(n.id);
                            window.location.hash = n.url_destino!;
                          }}
                        >
                          Ver Detalhes <ChevronRight size={14} style={{ marginLeft: '0.25rem' }} />
                        </Button>
                      )}
                      {!n.lida && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          style={{ color: 'hsl(var(--primary))', fontSize: '0.75rem', fontWeight: 600 }}
                          onClick={() => handleMarkRead(n.id)}
                        >
                          Marcar como lida
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificacoesPage;
