import React, { useState } from 'react';
import type { KanbanCardType } from '../../services/kanbanService.js';
import { Calendar, Clock, User, AlertTriangle, Layers } from 'lucide-react';

interface KanbanCardProps {
  card: KanbanCardType;
  onClick: () => void;
}

export default function KanbanCard({ card, onClick }: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Calcula o tempo que o cartão está na coluna atual em dias
  const obterTempoNaColuna = () => {
    const dataUpdate = new Date(card.updated_at);
    const hoje = new Date();
    const diffTime = Math.abs(hoje.getTime() - dataUpdate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '⏱ < 24h';
    if (diffDays === 1) return '⏱ 1 dia aqui';
    return `⏱ ${diffDays} dias aqui`;
  };

  const formatarData = (dataStr: string | null) => {
    if (!dataStr) return 'Não definida';
    const parts = dataStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return new Date(dataStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' });
  };

  const getPrioridadeBadge = (prioridade: number) => {
    if (prioridade === 1)
      return {
        text: '🔥 URGENTE',
        class: 'bg-destructive/20 text-destructive border-destructive/25',
      };
    if (prioridade === 9)
      return { text: '☘ BAIXA', class: 'bg-green-500/20 text-green-400 border-green-500/25' };
    return { text: '⚡ NORMAL', class: 'bg-amber-500/20 text-amber-400 border-amber-500/25' };
  };

  const isAtrasado = () => {
    if (card.status_kanban === 'concluido' || !card.data_prazo) return false;
    const prazo = new Date(card.data_prazo);
    const hoje = new Date();
    // Zera hora para comparar apenas data
    prazo.setHours(0, 0, 0, 0);
    hoje.setHours(0, 0, 0, 0);
    return prazo < hoje;
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', String(card.id));
    e.dataTransfer.setData('statusAnterior', card.status_kanban);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const pBadge = getPrioridadeBadge(card.prioridade);
  const atrasado = isAtrasado();

  // Iniciais do responsável
  const getIniciais = (name: string | null) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className={`
        p-4 rounded-[var(--ui-radius-lg)] border border-[var(--ui-border)] bg-[var(--ui-surface)]/95 text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-1)] hover:shadow-[var(--ui-shadow-2)] cursor-grab active:cursor-grabbing transition-all select-none group
        ${isDragging ? 'opacity-40 border-primary border-dashed scale-95' : ''}
        ${atrasado ? 'ring-1 ring-destructive/40 hover:ring-destructive' : 'hover:border-[var(--ui-color-gold-500)]/30'}
      `}
    >
      {/* Header do Card */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono font-bold text-foreground group-hover:text-primary transition-colors">
          {card.numero_op}
        </span>
        <span
          className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full border ${pBadge.class}`}
        >
          {pBadge.text}
        </span>
      </div>

      {/* Cliente / Descrição */}
      <h4 className="text-sm font-semibold text-foreground line-clamp-1 mb-2">
        {card.cliente_nome || 'Cliente avulso'}
      </h4>

      {/* Detalhe da Etapa */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 bg-muted/30 p-1.5 rounded-lg border border-border/40">
        <Layers className="w-3.5 h-3.5 text-primary/75" />
        <span className="font-medium text-foreground/80">
          Etapa: {card.etapa_nome} ({card.etapa_numero}/5)
        </span>
      </div>

      {/* Rodapé do Card */}
      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {/* Prazo */}
          <div
            className={`flex items-center gap-1 font-medium ${atrasado ? 'text-destructive font-semibold' : ''}`}
          >
            <Clock className="w-3 h-3" />
            <span>{formatarData(card.data_prazo)}</span>
            {atrasado && <AlertTriangle className="w-3 h-3 text-destructive animate-pulse" />}
          </div>

          {/* Tempo na Coluna */}
          <span className="text-muted-foreground/60">{obterTempoNaColuna()}</span>
        </div>

        {/* Responsável Avatar */}
        <div className="relative group/avatar">
          {card.responsavel_id ? (
            <div
              className="w-5 h-5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-[9px] cursor-help"
              title={`Responsável: ${card.responsavel_nome}`}
            >
              {getIniciais(card.responsavel_nome)}
            </div>
          ) : (
            <div
              className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground cursor-help"
              title="Sem responsável"
            >
              <User className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
