import React from 'react';
import KanbanBoard from '../components/kanban/KanbanBoard.tsx';

export default function Producao() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in">
      <KanbanBoard title="Controle de Produção PCP" />
    </div>
  );
}
