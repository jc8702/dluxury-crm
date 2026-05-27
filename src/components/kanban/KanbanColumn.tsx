import React, { useState } from 'react';
import type { KanbanCardType } from '../../services/kanbanService.js';
import KanbanCard from './KanbanCard.tsx';
import { ChevronRight, ChevronDown, CheckCircle2, PlayCircle, Ban, HelpCircle } from 'lucide-react';

interface KanbanColumnProps {
  titulo: string;
  status: 'a_fazer' | 'em_progresso' | 'bloqueado' | 'concluido';
  cards: KanbanCardType[];
  onCardDrop: (cardId: number, novoStatus: 'a_fazer' | 'em_progresso' | 'bloqueado' | 'concluido', statusAnterior: string) => void;
  onCardClick: (card: KanbanCardType) => void;
}

export default function KanbanColumn({ titulo, status, cards, onCardDrop, onCardClick }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getHeaderStyle = () => {
    switch (status) {
      case 'a_fazer':
        return { icon: <HelpCircle className="w-5 h-5 text-muted-foreground" />, border: 'border-t-4 border-t-muted-foreground/60', bg: 'bg-muted/10' };
      case 'em_progresso':
        return { icon: <PlayCircle className="w-5 h-5 text-primary" />, border: 'border-t-4 border-t-primary', bg: 'bg-primary/5' };
      case 'bloqueado':
        return { icon: <Ban className="w-5 h-5 text-destructive" />, border: 'border-t-4 border-t-destructive', bg: 'bg-destructive/5' };
      case 'concluido':
        return { icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, border: 'border-t-4 border-t-green-500', bg: 'bg-green-500/5' };
    }
  };

  const headerStyle = getHeaderStyle();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isCollapsed) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (isCollapsed) return;

    const cardId = e.dataTransfer.getData('text/plain');
    const statusAnterior = e.dataTransfer.getData('statusAnterior');

    if (cardId && statusAnterior && statusAnterior !== status) {
      onCardDrop(Number(cardId), status, statusAnterior);
    }
  };

  if (isCollapsed) {
    return (
      <div
        className="w-12 flex flex-col items-center bg-card border border-border rounded-xl py-4 hover:bg-muted/20 cursor-pointer select-none transition-all shadow-sm"
        onClick={() => setIsCollapsed(false)}
      >
        <ChevronRight className="w-5 h-5 text-muted-foreground mb-4" />
        <div className="writing-mode-vertical text-xs font-bold text-foreground/80 tracking-wider uppercase flex items-center gap-2 transform rotate-180">
          <span>{titulo}</span>
          <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-[10px]">
            {cards.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex-1 min-w-[280px] flex flex-col rounded-2xl border bg-card/45 backdrop-blur-sm shadow-sm transition-all duration-200
        ${headerStyle.border}
        ${isDragOver ? 'border-primary/50 bg-primary/5 scale-[1.01] ring-1 ring-primary/20' : 'border-border'}
      `}
    >
      {/* Header da Coluna */}
      <div 
        className={`flex items-center justify-between p-4 border-b border-border/60 rounded-t-2xl cursor-pointer select-none ${headerStyle.bg}`}
        onClick={() => setIsCollapsed(true)}
        title="Clique para colapsar"
      >
        <div className="flex items-center gap-2">
          {headerStyle.icon}
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
            {titulo}
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
            {cards.length}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground opacity-55 hover:opacity-100 transition-opacity" />
      </div>

      {/* Lista de Cards */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 max-h-[70vh] min-h-[400px]">
        {cards.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-xl p-6 text-center text-xs text-muted-foreground/60 select-none">
            Arraste etapas aqui
          </div>
        ) : (
          cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
            />
          ))
        )}
      </div>
    </div>
  );
}
