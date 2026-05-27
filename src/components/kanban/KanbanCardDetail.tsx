import React, { useEffect, useState } from 'react';
import { kanbanService } from '../../services/kanbanService.js';
import type { KanbanCardType, MovimentoKanbanType } from '../../services/kanbanService.js';
import { api } from '../../lib/api.js';
import { X, Send, Calendar, Clock, User, MessageSquare, ShieldAlert } from 'lucide-react';
import ChatIntegrado from '../whatsapp/ChatIntegrado.js';

interface KanbanCardDetailProps {
  card: KanbanCardType;
  onClose: () => void;
  onUpdate: (updatedCard: KanbanCardType) => void;
}

export default function KanbanCardDetail({ card, onClose, onUpdate }: KanbanCardDetailProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [responsavelId, setResponsavelId] = useState<string>(card.responsavel_id || '');
  const [nota, setNota] = useState('');
  const [historico, setHistorico] = useState<MovimentoKanbanType[]>([]);
  const [chatAtivo, setChatAtivo] = useState(false);

  useEffect(() => {
    carregarUsuarios();
    carregarHistorico();
  }, [card.id]);

  const carregarUsuarios = async () => {
    try {
      const data = await api.users.list();
      setUsers(data || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const carregarHistorico = async () => {
    try {
      const data = await kanbanService.getCardHistory(card.id);
      setHistorico(data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  const salvarAlteracoes = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const respId = responsavelId === '' ? null : responsavelId;
      const res = await kanbanService.updateCardDetails(card.id, respId, nota.trim() || undefined);
      
      onUpdate(res.etapa);
      setHistorico(res.historico);
      setNota('');
      
      // Se não digitou nota e só alterou responsável, podemos notificar sucesso
      if (!nota.trim()) {
        alert('Responsável atualizado com sucesso!');
      }
    } catch (err: any) {
      console.error('Erro ao salvar alterações da etapa:', err);
      alert(err.message || 'Erro ao salvar alterações.');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (dataStr: string | null) => {
    if (!dataStr) return 'Não definida';
    const date = new Date(dataStr);
    // Adicionar offset local se necessário, ou usar string splits por ser data
    const parts = dataStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return date.toLocaleDateString('pt-BR');
  };

  const getPrioridadeBadge = (prioridade: number) => {
    if (prioridade === 1) return { text: 'Urgente', class: 'bg-destructive/20 text-destructive border-destructive/30' };
    if (prioridade === 9) return { text: 'Baixa', class: 'bg-green-500/20 text-green-500 border-green-500/30' };
    return { text: 'Normal', class: 'bg-amber-500/20 text-amber-500 border-amber-500/30' };
  };

  const prioridadeBadge = getPrioridadeBadge(card.prioridade);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className={`relative w-full max-h-[90vh] overflow-hidden flex flex-row rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200 transition-all duration-300 ${chatAtivo ? 'max-w-5xl' : 'max-w-2xl'}`}>
        
        {/* Coluna da Esquerda: Detalhes da OP */}
        <div className="flex-1 flex flex-col min-w-0 max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {card.numero_op}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${prioridadeBadge.class}`}>
                  {prioridadeBadge.text}
                </span>
              </div>
              <h3 className="text-xl font-bold text-foreground">
                {card.cliente_nome || 'Cliente avulso'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Grid de Metadados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border border-border bg-muted/10">
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Etapa Atual
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {card.etapa_nome} ({card.etapa_numero}/5)
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Setor / Ambiente
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {card.environment || 'Geral'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Início da Etapa
                </span>
                <div className="flex items-center gap-1 text-sm font-semibold text-foreground mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{formatarData(card.data_inicio)}</span>
                </div>
              </div>
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Prazo Final OP
                </span>
                <div className="flex items-center gap-1 text-sm font-semibold text-foreground mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className={card.data_conclusao === null && card.data_prazo && new Date(card.data_prazo) < new Date() ? 'text-destructive font-bold' : ''}>
                    {formatarData(card.data_prazo)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações / Formulário de Edição */}
            <form onSubmit={salvarAlteracoes} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" />
                  Atribuir Responsável da Etapa
                </label>
                <select
                  value={responsavelId}
                  onChange={(e) => setResponsavelId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  <option value="">Nenhum Responsável</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Escrever Comentário / Nota
                </label>
                <div className="relative">
                  <textarea
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="Descreva detalhes operacionais, impedimentos ou atualizações..."
                    rows={3}
                    className="w-full px-3 py-2 pr-12 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="absolute right-3 bottom-3 p-2 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground rounded-lg transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>

            {/* Histórico / Atividades */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                Histórico & Notas de Auditoria
              </h4>

              {historico.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum movimento ou nota registrado para esta etapa.
                </p>
              ) : (
                <div className="relative border-l border-border pl-4 space-y-4 py-2 ml-2">
                  {historico.map((h) => (
                    <div key={h.id} className="relative text-xs space-y-1">
                      {/* Marcador na linha do tempo */}
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-border border-2 border-card" />
                      
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-semibold text-foreground/80">
                          {h.usuario_nome || 'Usuário desconhecido'}
                        </span>
                        <span>
                          {new Date(h.timestamp_movimento).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      {h.status_anterior !== h.status_novo ? (
                        <p className="text-muted-foreground">
                          Movimentou de{' '}
                          <span className="font-mono text-foreground font-semibold">
                            {(h.status_anterior || 'a_fazer').replace('_', ' ').toUpperCase()}
                          </span>{' '}
                          para{' '}
                          <span className="font-mono text-primary font-semibold">
                            {h.status_novo.replace('_', ' ').toUpperCase()}
                          </span>
                        </p>
                      ) : (
                        <p className="text-muted-foreground">
                          Adicionou um comentário na etapa.
                        </p>
                      )}

                      {h.nota && (
                        <div className="p-2.5 mt-1 rounded bg-muted/50 border border-border text-foreground/90 font-mono text-[11px] leading-relaxed break-words">
                          {h.nota}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/15">
            {card.cliente_telefone ? (
              <button
                type="button"
                onClick={() => setChatAtivo(!chatAtivo)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  chatAtivo 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)] border border-transparent' 
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                {chatAtivo ? 'Ocultar Chat' : 'Conversar (WhatsApp)'}
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="Cliente sem telefone cadastrado"
                className="px-4 py-2 border border-border bg-muted text-muted-foreground text-sm font-semibold rounded-lg flex items-center gap-1.5 cursor-not-allowed opacity-50"
              >
                <MessageSquare className="w-4 h-4" />
                Sem WhatsApp
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border bg-background hover:bg-muted text-sm font-semibold rounded-lg text-foreground transition-all"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Coluna da Direita: Chat integrado */}
        {chatAtivo && (
          <div className="w-[380px] shrink-0 border-l border-border h-full max-h-[90vh]">
            <ChatIntegrado
              orcamento_id={card.orcamento_id}
              operacao_prod_id={card.operacao_prod_id}
              numero_telefone={card.cliente_telefone || ''}
              contato_nome={card.cliente_nome}
            />
          </div>
        )}
      </div>
    </div>
  );
}
