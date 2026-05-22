'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, Filter, FileText, 
  ChevronRight, Clock, Box, Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { Modal } from '../../../../design-system/components';

interface HistoricoModalProps {
  onLoadPlan: (plan: any) => void;
  onFechar: () => void;
}

export function HistoricoModal({ onLoadPlan, onFechar }: HistoricoModalProps) {
  const [planos, setPlanos] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroProjeto, setFiltroProjeto] = useState('');

  useEffect(() => {
    async function carregarDados() {
      try {
        const [listaPlanos, listaProjetos] = await Promise.all([
          api.planoCorte.list(),
          api.projects.list()
        ]);
        setPlanos(listaPlanos || []);
        setProjetos(listaProjetos || []);
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  const planosFiltrados = planos.filter(p => {
    const matchesTexto = p.nome.toLowerCase().includes(filtroTexto.toLowerCase());
    const matchesProjeto = !filtroProjeto || p.projeto_id === filtroProjeto;
    return matchesTexto && matchesProjeto;
  });

  return (
    <Modal
      isOpen={true}
      onClose={onFechar}
      title="Histórico de Planos"
      size="lg"
    >
      <div className="flex flex-col gap-6 max-h-[75vh]">
        {/* FILTROS */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome do plano..." 
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-input border border-border/80 rounded-xl text-sm focus:border-primary/50 outline-none transition-all text-foreground"
            />
          </div>
          <div className="w-72 relative group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <select 
              value={filtroProjeto}
              onChange={e => setFiltroProjeto(e.target.value)}
              className="w-full h-11 pl-11 pr-10 bg-input border border-border/80 rounded-xl text-sm focus:border-primary/50 outline-none transition-all appearance-none cursor-pointer text-foreground"
            >
              <option value="">Todos os Projetos</option>
              {projetos.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.nome}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* LISTA DE RESULTADOS */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar min-h-[300px] max-h-[50vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest opacity-50">Sincronizando com a base de dados...</p>
            </div>
          ) : planosFiltrados.length > 0 ? (
            planosFiltrados.map(plano => (
              <div 
                key={plano.id} 
                onClick={() => onLoadPlan(plano)}
                className="group relative p-4 flex items-center justify-between bg-foreground/5 border border-border/40 rounded-2xl hover:border-primary/30 hover:bg-foreground/10 transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-background rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all border border-border/40 shadow-inner">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm mb-1 tracking-tight group-hover:text-primary transition-colors">{plano.nome}</h4>
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-foreground/5 rounded-lg">
                        <Calendar size={10} className="text-primary" /> 
                        {new Date(plano.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-foreground/5 rounded-lg">
                        <Box size={10} className="text-primary" /> 
                        {plano.resultado?.layouts?.length || 0} Chapas
                      </span>
                      {plano.projeto_id && (
                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                          {projetos.find(p => p.id === plano.projeto_id)?.nome || 'Móvel Custom'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-2xl font-black text-foreground tabular-nums leading-none">
                      {plano.resultado?.aproveitamento_percentual?.toFixed(1)}<span className="text-sm opacity-50">%</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Eficiência</div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-foreground/5 border border-border/40 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all shadow-lg group-hover:shadow-primary/20">
                    <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
              <FileText size={48} className="mb-4" />
              <h3 className="text-sm font-bold uppercase tracking-widest mb-1">Nenhum plano encontrado</h3>
              <p className="text-xs text-muted-foreground max-w-xs text-center">Tente buscar por outro termo ou projeto.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

