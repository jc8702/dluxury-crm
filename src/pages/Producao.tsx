import React from 'react';
import PCPKanbanBoard from '../components/kanban/PCPKanbanBoard.tsx';

export default function Producao() {
  return (
    <div className="flex flex-col h-full bg-[var(--ui-bg)] p-6 animate-fade-in">
      <PCPKanbanBoard />
    </div>
  );
}
