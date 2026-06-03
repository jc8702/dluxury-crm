import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCircle,
  Mail,
  ChevronRight,
  Clock,
  Package,
  FileText,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Check,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Notificacao } from '../api-lib/types';
import { useToast } from '../context/ToastContext';
import { CardSkeleton } from '../components/common/Skeleton';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '../components/common';

export default function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'não_lidas'>('não_lidas');
  const [priorityFilter, setPriorityFilter] = useState<'todas' | 'critica' | 'alta' | 'normal'>(
    'todas',
  );
  const [checking, setChecking] = useState(false);
  const { error: toastError, success: toastSuccess } = useToast();

  useEffect(() => {
    fetchNotificacoes();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNotificacoes = async () => {
    setLoading(true);
    try {
      const data = await api.notificacoes.list(filter === 'não_lidas');
      setNotificacoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      toastError('Erro ao carregar lista de notificações');
    } finally {
      setLoading(false);
    }
  };

  const forceCheck = async () => {
    setChecking(true);
    try {
      const res = await (api.notificacoes as any).generate();
      await fetchNotificacoes();
      const criadas = res?.criadas || res?.stats?.criadas || 0;
      if (criadas > 0) {
        toastSuccess(`${criadas} nova(s) notificação(ões) gerada(s)`);
      } else {
        toastSuccess('Nenhum alerta novo identificado');
      }
    } catch (err: any) {
      toastError(err.message || 'Erro ao processar verificação');
    } finally {
      setChecking(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.notificacoes.markAllRead();
      fetchNotificacoes();
      toastSuccess('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      toastError('Erro ao marcar todas como lidas');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.notificacoes.markRead(id);
      // Atualização otimista no local state para evitar lag de rede
      setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  // Contadores analíticos
  const stats = useMemo(() => {
    const total = notificacoes.length;
    const naoLidas = notificacoes.filter((n) => !n.lida).length;
    const criticas = notificacoes.filter((n) => n.prioridade === 'critica' && !n.lida).length;
    const altas = notificacoes.filter((n) => n.prioridade === 'alta' && !n.lida).length;
    return { total, naoLidas, criticas, altas };
  }, [notificacoes]);

  // Lista filtrada por prioridade e status
  const filteredNotificacoes = useMemo(() => {
    let list = [...notificacoes];
    if (priorityFilter !== 'todas') {
      list = list.filter((n) => n.prioridade === priorityFilter);
    }
    return list;
  }, [notificacoes, priorityFilter]);

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critica':
        return { text: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' };
      case 'alta':
        return { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' };
      case 'normal':
        return { text: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' };
      default:
        return { text: 'text-muted-foreground', border: 'border-border', bg: 'bg-muted/10' };
    }
  };

  const getIcon = (type: string, priority: string) => {
    const style = getPriorityStyle(priority);
    switch (type) {
      case 'estoque_critico':
        return <Package className={`w-5 h-5 ${style.text}`} />;
      case 'prazo_projeto':
        return <Calendar className={`w-5 h-5 ${style.text}`} />;
      case 'orcamento_sem_resposta':
        return <FileText className={`w-5 h-5 ${style.text}`} />;
      case 'garantia_pendente':
        return <Mail className={`w-5 h-5 ${style.text}`} />;
      case 'cobranca_vencida':
        return <ShieldAlert className={`w-5 h-5 ${style.text}`} />;
      default:
        return <Bell className={`w-5 h-5 ${style.text}`} />;
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in pb-20">
      {/* Header Corporativo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-border pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
              <Bell className="text-primary w-6 h-6 animate-pulse" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">
              Monitoramento e Alertas
            </span>
          </div>
          <h1 className="text-5xl font-black italic tracking-tighter">
            CENTRAL DE{' '}
            <span className="text-primary underline decoration-primary/30 underline-offset-8">
              ALERTAS
            </span>
          </h1>
          <p className="text-muted-foreground mt-4 font-medium max-w-xl leading-relaxed">
            Monitoramento em tempo real de gargalos operacionais, estoques mínimos, prazos de
            projetos e cobranças financeiras.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="h-12 px-6 group border-border/40 hover:bg-muted"
            onClick={forceCheck}
            disabled={checking}
            isLoading={checking}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 transition-transform group-hover:rotate-180 ${checking ? 'animate-spin' : ''}`}
            />{' '}
            VERIFICAR NOVOS
          </Button>
          <Button
            variant="primary"
            className="h-12 px-8 font-black italic tracking-tight shadow-lg shadow-primary/20"
            onClick={markAllRead}
            disabled={stats.naoLidas === 0}
          >
            <Check className="w-5 h-5 mr-2" /> MARCAR TODAS COMO LIDAS
          </Button>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          {
            label: 'Alertas Pendentes',
            value: stats.naoLidas,
            color: 'text-primary',
            border: 'border-primary/20',
            desc: 'Aguardando verificação',
          },
          {
            label: 'Risco Crítico',
            value: stats.criticas,
            color: 'text-red-400',
            border: 'border-red-500/30',
            desc: 'Cobranças e estoques zerados',
          },
          {
            label: 'Urgências (Alta)',
            value: stats.altas,
            color: 'text-amber-400',
            border: 'border-amber-500/30',
            desc: 'Prazos e garantias',
          },
          {
            label: 'Total Histórico',
            value: stats.total,
            color: 'text-blue-400',
            border: 'border-blue-500/30',
            desc: 'Notificações no cache atual',
          },
        ].map((card, i) => (
          <div
            key={i}
            className={`glass-elevated p-6 rounded-2xl border-l-4 ${card.border} relative overflow-hidden group`}
          >
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic mb-3">
              {card.label}
            </p>
            <p className={`text-4xl font-black italic tracking-tighter ${card.color}`}>
              {card.value}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground mt-2">{card.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Filtros Laterais */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="glass-elevated rounded-3xl border border-border">
            <CardHeader>
              <CardTitle className="text-xs font-black tracking-widest uppercase italic">
                Filtro de Leitura
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-4 pt-0">
              <Button
                variant={filter === 'não_lidas' ? 'primary' : 'ghost'}
                className="w-full justify-start rounded-2xl h-12 font-bold uppercase tracking-wider text-xs"
                onClick={() => setFilter('não_lidas')}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full mr-3 ${filter === 'não_lidas' ? 'bg-black' : 'bg-primary'}`}
                />
                Não Lidas ({stats.naoLidas})
              </Button>
              <Button
                variant={filter === 'todas' ? 'primary' : 'ghost'}
                className="w-full justify-start rounded-2xl h-12 font-bold uppercase tracking-wider text-xs"
                onClick={() => setFilter('todas')}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full mr-3 ${filter === 'todas' ? 'bg-black' : 'bg-muted-foreground'}`}
                />
                Todas no Histórico ({stats.total})
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-elevated rounded-3xl border border-border">
            <CardHeader>
              <CardTitle className="text-xs font-black tracking-widest uppercase italic">
                Filtrar por Gravidade
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-4 pt-0">
              {[
                { val: 'todas', label: 'Todos os Alertas', color: 'bg-muted-foreground' },
                { val: 'critica', label: 'Crítico', color: 'bg-red-500' },
                { val: 'alta', label: 'Alto', color: 'bg-amber-500' },
                { val: 'normal', label: 'Normal', color: 'bg-blue-500' },
              ].map((item) => (
                <Button
                  key={item.val}
                  variant={priorityFilter === item.val ? 'secondary' : 'ghost'}
                  className={`w-full justify-start rounded-2xl h-12 font-bold uppercase tracking-wider text-xs border ${priorityFilter === item.val ? 'border-primary/20 bg-primary/10 text-primary' : 'border-transparent'}`}
                  onClick={() => setPriorityFilter(item.val as any)}
                >
                  <div className={`w-2 h-2 rounded-full mr-3 ${item.color}`} />
                  {item.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Lista de Alertas */}
        <div className="lg:col-span-9">
          <Card className="glass-elevated rounded-[2.5rem] overflow-hidden border border-border shadow-2xl">
            <CardContent className="p-0 min-h-[500px]">
              {loading ? (
                <div className="p-8 space-y-6">
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : filteredNotificacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[500px] gap-6 text-center">
                  <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-inner">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic tracking-tight uppercase">
                      TUDO MONITORADO
                    </h3>
                    <p className="text-muted-foreground mt-2 max-w-sm font-medium text-xs uppercase tracking-wider leading-relaxed">
                      Nenhuma notificação identificada para os parâmetros selecionados. Sua operação
                      está sob controle.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredNotificacoes.map((n) => {
                    const style = getPriorityStyle(n.prioridade);
                    return (
                      <div
                        key={n.id}
                        className={`flex gap-6 p-6 transition-all duration-300 relative group hover:bg-muted/10 ${n.lida ? 'opacity-50' : ''}`}
                      >
                        {/* Linha vertical de destaque para não lidas */}
                        {!n.lida && (
                          <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary" />
                        )}

                        {/* Icon Container */}
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${style.border} ${style.bg}`}
                        >
                          {getIcon(n.tipo, n.prioridade)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-4 mb-1">
                            <div className="flex flex-wrap items-center gap-3 min-w-0">
                              <h4 className="text-base font-black italic tracking-tight uppercase text-white truncate max-w-[400px]">
                                {n.titulo}
                              </h4>
                              <span
                                className={`text-[8px] font-black px-2.5 py-0.5 rounded-md border tracking-widest uppercase ${
                                  n.prioridade === 'critica'
                                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                    : n.prioridade === 'alta'
                                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                      : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                }`}
                              >
                                {n.prioridade}
                              </span>
                            </div>

                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                              <Clock size={12} className="text-primary opacity-60" />{' '}
                              {new Date(n.created_at!).toLocaleString('pt-BR')}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground font-medium mb-4 leading-relaxed">
                            {n.mensagem}
                          </p>

                          <div className="flex gap-2 items-center">
                            {n.url_destino && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-4 rounded-xl text-xs font-black italic tracking-wider border-border/40 hover:bg-muted"
                                onClick={() => {
                                  handleMarkRead(n.id);
                                  window.location.hash = n.url_destino!;
                                }}
                              >
                                RESOLVER ALERTA{' '}
                                <ArrowRight
                                  size={14}
                                  className="ml-2 group-hover:translate-x-1 transition-transform"
                                />
                              </Button>
                            )}
                            {!n.lida && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-4 text-xs font-black tracking-widest text-primary hover:bg-primary/10 rounded-xl"
                                onClick={() => handleMarkRead(n.id)}
                              >
                                MARCAR COMO LIDO
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
