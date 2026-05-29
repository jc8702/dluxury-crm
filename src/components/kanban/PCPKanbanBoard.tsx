import React, { useEffect, useState } from 'react';
import { kanbanService } from '../../services/kanbanService.js';
import type { KanbanBoardData, KanbanCardType } from '../../services/kanbanService.js';
import KanbanColumn from './KanbanColumn.tsx';
import KanbanFilters from './KanbanFilters.tsx';
import KanbanCardDetail from './KanbanCardDetail.tsx';
import { Activity, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface KanbanBoardProps {
  title?: string;
  items?: any;
  columns?: any;
  onMove?: any;
  onEdit?: any;
  onDelete?: any;
}

export default function PCPKanbanBoard() {
  const [boardData, setBoardData] = useState<KanbanBoardData>({
    a_fazer: [],
    em_progresso: [],
    bloqueado: [],
    concluido: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    filtro_responsavel: '',
    filtro_prioridade: '' as number | '',
    filtro_ambiente: '',
    busca: '',
  });

  // Cartão selecionado para abrir modal de detalhes
  const [selectedCard, setSelectedCard] = useState<KanbanCardType | null>(null);

  const carregarBoard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kanbanService.getBoard(filtros);
      setBoardData(data || { a_fazer: [], em_progresso: [], bloqueado: [], concluido: [] });
    } catch (err: any) {
      console.error('Erro ao carregar Kanban Board:', err);
      setError(err.message || 'Erro ao carregar o painel Kanban de produção.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarBoard();
  }, [filtros]);

  const handleFilterChange = (novosFiltros: typeof filtros) => {
    setFiltros(novosFiltros);
  };

  const handleCardDrop = async (
    cardId: number,
    novoStatus: 'a_fazer' | 'em_progresso' | 'bloqueado' | 'concluido',
    statusAnterior: string
  ) => {
    // 1. OTIMISTIC UPDATE: Mover localmente na UI imediatamente
    let cardMovido: KanbanCardType | null = null;
    const oldBoard = { ...boardData };
    const newBoard = { ...boardData };

    // Achar o card no status anterior
    const colAnterior = statusAnterior as keyof KanbanBoardData;
    const idx = newBoard[colAnterior]?.findIndex((c) => c.id === cardId);
    
    if (idx !== undefined && idx !== -1 && newBoard[colAnterior]) {
      const list = [...newBoard[colAnterior]];
      const [removed] = list.splice(idx, 1);
      newBoard[colAnterior] = list;
      
      cardMovido = { ...removed, status_kanban: novoStatus, updated_at: new Date().toISOString() };
      
      const colNova = novoStatus as keyof KanbanBoardData;
      if (newBoard[colNova]) {
        newBoard[colNova] = [...newBoard[colNova], cardMovido];
      }
    }

    setBoardData(newBoard);

    // 2. Chamar API no backend
    try {
      await kanbanService.moveCard(cardId, novoStatus, statusAnterior);
      // Se moveu com sucesso, opcionalmente recarregamos o board ou mantemos a UI otimista
      // Vamos recarregar para pegar dados calculados de datas no banco (ex: data_inicio/conclusao)
      carregarBoard();
    } catch (err: any) {
      console.error('Falha ao mover etapa no banco de dados:', err);
      alert(`Falha ao salvar a movimentação: ${err.message || 'Erro interno'}`);
      // Reverter se der erro
      setBoardData(oldBoard);
    }
  };

  const handleCardUpdate = (updatedCard: KanbanCardType) => {
    // Substituir o card atualizado no estado local do board
    const newBoard = { ...boardData };
    const col = updatedCard.status_kanban as keyof KanbanBoardData;
    
    if (newBoard[col]) {
      newBoard[col] = newBoard[col].map((c) => (c.id === updatedCard.id ? updatedCard : c));
    }
    
    setBoardData(newBoard);
    if (selectedCard?.id === updatedCard.id) {
      setSelectedCard(updatedCard);
    }
  };

  const totalCards = 
    boardData.a_fazer.length + 
    boardData.em_progresso.length + 
    boardData.bloqueado.length + 
    boardData.concluido.length;

  return (
    <div className="space-y-6">
      {/* Botão de recarregar discreto */}
      <div className="flex justify-end pr-2">
        <button
          onClick={carregarBoard}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border bg-background hover:bg-muted text-foreground rounded-lg transition-all cursor-pointer"
          title="Recarregar Quadro"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Quadro
        </button>
      </div>

      {/* Filtros */}
      <KanbanFilters onFilterChange={handleFilterChange} />

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-2 shadow-sm">
          <ShieldAlert className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid do Kanban Board */}
      {loading && totalCards === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm font-medium animate-pulse">
          Carregando informações da produção...
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none">
          <KanbanColumn
            titulo="A Fazer"
            status="a_fazer"
            cards={boardData.a_fazer}
            onCardDrop={handleCardDrop}
            onCardClick={setSelectedCard}
          />
          <KanbanColumn
            titulo="Em Progresso"
            status="em_progresso"
            cards={boardData.em_progresso}
            onCardDrop={handleCardDrop}
            onCardClick={setSelectedCard}
          />
          <KanbanColumn
            titulo="Bloqueado"
            status="bloqueado"
            cards={boardData.bloqueado}
            onCardDrop={handleCardDrop}
            onCardClick={setSelectedCard}
          />
          <KanbanColumn
            titulo="Concluído"
            status="concluido"
            cards={boardData.concluido}
            onCardDrop={handleCardDrop}
            onCardClick={setSelectedCard}
          />
        </div>
      )}

      {/* Modal de Detalhes do Card */}
      {selectedCard && (
        <KanbanCardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleCardUpdate}
        />
      )}
    </div>
  );
}
