import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Search, RotateCcw, Filter, User, AlertCircle, Layers } from 'lucide-react';

interface KanbanFiltersProps {
  onFilterChange: (filters: {
    filtro_responsavel: string;
    filtro_prioridade: number | '';
    filtro_ambiente: string;
    busca: string;
  }) => void;
}

export default function KanbanFilters({ onFilterChange }: KanbanFiltersProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState<number | ''>('');
  const [filtroAmbiente, setFiltroAmbiente] = useState('');

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const data = await api.users.list();
      setUsers(data || []);
    } catch (err) {
      console.error('Erro ao carregar usuários para o filtro:', err);
    }
  };

  const aplicarFiltros = () => {
    onFilterChange({
      filtro_responsavel: filtroResponsavel,
      filtro_prioridade: filtroPrioridade,
      filtro_ambiente: filtroAmbiente,
      busca: busca,
    });
  };

  useEffect(() => {
    aplicarFiltros();
  }, [busca, filtroResponsavel, filtroPrioridade, filtroAmbiente]);

  const limparFiltros = () => {
    setBusca('');
    setFiltroResponsavel('');
    setFiltroPrioridade('');
    setFiltroAmbiente('');
  };

  return (
    <div className="p-4 mb-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-foreground font-semibold">
        <Filter className="w-5 h-5 text-primary" />
        <span>Filtros Avançados</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Busca Textual */}
        <div className="relative">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Buscar Código OP ou Cliente
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Ex: OP-2026, João..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all uppercase"
            />
          </div>
        </div>

        {/* Responsável */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Responsável Etapa
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={filtroResponsavel}
              onChange={(e) => setFiltroResponsavel(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="">Todos os Responsáveis</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Prioridade */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Prioridade da OP
          </label>
          <div className="relative">
            <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={filtroPrioridade}
              onChange={(e) => setFiltroPrioridade(e.target.value ? Number(e.target.value) : '')}
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="">Todas as Prioridades</option>
              <option value="1">1 - Urgente</option>
              <option value="5">5 - Normal</option>
              <option value="9">9 - Baixa</option>
            </select>
          </div>
        </div>

        {/* Ambiente */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Setor / Ambiente Físico
          </label>
          <div className="relative">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={filtroAmbiente}
              onChange={(e) => setFiltroAmbiente(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="">Todos os Setores</option>
              <option value="Setor A">Setor A - Preparação</option>
              <option value="Setor B">Setor B - Usinagem / CNC</option>
              <option value="Setor C">Setor C - Bordas</option>
              <option value="Setor D">Setor D - Montagem Prévia</option>
              <option value="Setor E">Setor E - Embalagem & Logística</option>
            </select>
          </div>
        </div>
      </div>

      {(busca || filtroResponsavel || filtroPrioridade || filtroAmbiente) && (
        <div className="flex justify-end">
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg border border-transparent hover:border-border transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar Filtros
          </button>
        </div>
      )}
    </div>
  );
}
